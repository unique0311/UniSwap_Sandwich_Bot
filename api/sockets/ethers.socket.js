const { ethers } = require('ethers');
// const { ChainId, TokenAmount, Fetcher, Route, Trade, TradeType, Percent } = require('@uniswap/sdk');
const BigNumber = require("bignumber.js");
const { erc20abi } = require("../abi/abi");
const token_abi = require("../abi/token_abi.json");
const uniswap_abi = require("../abi/uniswap_abi.json");
const uniswap_factory_abi = require("../abi/uniswap_factory_abi.json");
const uniswap_pair_abi = require("../abi/uniswap_pair_abi.json");
// const moment = require('moment');

const rpc_url = process.env.RPC_URL;
const ws_url = process.env.WS_URL;
const uniswap = process.env.UNISWAP;
const wethaddress = process.env.WETH_ADDRESS;

const ethProvider = new ethers.providers.JsonRpcProvider(rpc_url);
const wsProvider = new ethers.providers.WebSocketProvider(ws_url);

const swapETHForExactTokens = new RegExp("^0xfb3bdb41");
const swapExactETHForTokens = new RegExp("^0x7ff36ab5");
const swapExactETHForTokensSupportingFeeOnTransferTokens = new RegExp("^0xb6f9de95");

const swapExactTokensForTokens = new RegExp("^0x38ed1739");
const swapTokensForExactTokens = new RegExp("^0x8803dbee");
const swapExactTokensForTokensSupportingFeeOnTransferTokens = new RegExp("^0x5c11d795");

const swapExactTokensForETH = new RegExp("^0x18cbafe5");
const swapTokensForExactETH = new RegExp("^0x4a25d94a");
const swapExactTokensForETHSupportingFeeOnTransferTokens = new RegExp("^0x791ac947");

// eslint-disable-next-line no-unused-vars
const SWAPHEXCODE = [
    swapETHForExactTokens,
    swapExactETHForTokens,
    swapExactETHForTokensSupportingFeeOnTransferTokens,
    swapExactTokensForTokens,
    swapTokensForExactTokens,
    swapExactTokensForTokensSupportingFeeOnTransferTokens,
    swapExactTokensForETH,
    swapTokensForExactETH,
    swapExactTokensForETHSupportingFeeOnTransferTokens,
];

const SWAPFUNCNAMES = [
    "swapETHForExactTokens",
    "swapExactETHForTokens",
    "swapExactETHForTokensSupportingFeeOnTransferTokens",
    "swapExactTokensForTokens",
    "swapTokensForExactTokens",
    "swapExactTokensForTokensSupportingFeeOnTransferTokens",
    "swapExactTokensForETH",
    "swapTokensForExactETH",
    "swapExactTokensForETHSupportingFeeOnTransferTokens",
];

// eslint-disable-next-line no-unused-vars
let checkRegEx = (regArr, data) => {
    try {
        for (let i = 0; i < regArr.length; i++) {
            if (regArr[i].test(data)) return true;
        }
        return false;
    } catch (err) {
        console.log('[ERROR->checkRegEx]', err);
        return false;
    }
}

module.exports = io => {

    let intervalGetPriceId = null;

    let activeStatus = false;       // bot transactions active status
    let autoStop = false;            // stop bot automatically when it fails in transactions

    let runCount = 0;               // count buy/sell
    let runLimit = null;             // run limit
    let runningBuy = false;
    let runningSell = false;

    let envPrepend = "REACT_APP_";

    let plan = {
        started: true,
        public: process.env.REACT_APP_WALLET_ADDRESS,
        private: process.env.REACT_APP_WALLET_PRIVATE,
        fromToken: wethaddress,
        toToken: process.env.REACT_APP_TOKEN_ADDRESS,
        minAmount: process.env.REACT_APP_MIN_AMOUNT,
        maxAmount: process.env.REACT_APP_MAX_AMOUNT,
        enableFixAmount: true,
        minLimit: process.env.REACT_APP_IMPACT_MIN_LIMIT,
        autoAmount: process.env.REACT_APP_AUTO_AMOUNT,
        autoGasLimit: process.env.REACT_APP_AUTO_GAS_LIMIT,
        autoGasValue: process.env.REACT_APP_AUTO_GAS_VALUE,
        gasDiffLimit: process.env.REACT_APP_LIMIT_GAS_DIFF,
        gasPricePlus: process.env.REACT_APP_GAS_PRICE_PLUS,
        gasPriceMinus: process.env.REACT_APP_GAS_PRICE_MINUS,
        netEnv: process.env.REACT_APP_NET_ENV
    };

    // let chainId = plan.netEnv === "main" ? ChainId.MAINNET : ChainId.GÖRLI;

    let uniswapContract = null;
    let uniswapFactoryAddress = null;
    let uniswapFactoryContract = null;
    let uniswapPairAddress = null;
    let uniswapPairContract = null;
    // eslint-disable-next-line no-unused-vars
    let uniswapPair = null;

    let swapPair = {};

    let feeData = null;

    let myNonce;
    let signer;

    let walletBalance = {};

    const stopBotChkIfAutoStop = () => {
        if (autoStop) {
            activeStatus = false;
            plan.started = false;
        }
    };

    const emitBalance = async () => {
        const keys = Object.keys(walletBalance);
        const balanceList = keys.map((key) => ({
            symbol: walletBalance[key].symbol,
            balance: walletBalance[key].balance
        }));
        io.of("/api/ethers").emit("balances", JSON.stringify(balanceList));
    };

    const getEthBalance = async (wa, pk) => {
        const eth_balance = await ethProvider.getBalance(wa);
        // const wallet = new ethers.Wallet(pk, ethProvider);
        // const eth_balance = await wallet.getBalance();
        const symbol = "ETH";
        const formated_eth_balance = ethers.utils.formatEther(eth_balance);

        walletBalance.ETH = {
            symbol: symbol,
            balance: formated_eth_balance,
            decimals: 18,
            token_address: ""
        };

        return walletBalance.ETH;
    };

    const getBalance = async (ta) => {
        ta = ta.toLowerCase();
        const tokenContract = new ethers.Contract(ta, token_abi, ethProvider);
        const balance = await tokenContract.balanceOf(plan.public);
        const symbol = await tokenContract.symbol();
        const decimals = await tokenContract.decimals();
        const formated_balance = ethers.utils.formatUnits(balance, decimals);
        walletBalance[ta] = {
            symbol: symbol,
            balance: formated_balance,
            decimals: decimals,
            token_address: ta
        };
        return walletBalance[ta];
    };

    const getBalances = async (wa, pk, fromToken, toToken) => {
        try {
            await getEthBalance(wa, pk);
            await getBalance(fromToken);
            await getBalance(toToken);

            emitBalance();
        } catch (e) {
            console.log(e);
        }
    };

    const getImpact = async (fromToken, toToken, ftAmount, ttAmount, reserves, token0, token1, fromDecimals, toDecimals, funcName) => {
        let liquidity0;
        let liquidity1;
        let formatedFtAmount = ethers.utils.formatUnits(ftAmount, fromDecimals);
        ftAmount = new BigNumber(formatedFtAmount);
        let formatedTtAmount = ethers.utils.formatUnits(ttAmount, toDecimals);
        ttAmount = new BigNumber(formatedTtAmount);
        if (fromToken.toLowerCase() === token1.toLowerCase()) {
            liquidity0 = reserves[1];
            liquidity1 = reserves[0];
        } else if (fromToken.toLowerCase() === token0.toLowerCase()) {
            liquidity0 = reserves[0];
            liquidity1 = reserves[1];
        }
        let formarted_liquidity0 = ethers.utils.formatUnits(liquidity0, fromDecimals);
        let formarted_liquidity1 = ethers.utils.formatUnits(liquidity1, toDecimals);
        liquidity0 = new BigNumber(formarted_liquidity0);
        liquidity1 = new BigNumber(formarted_liquidity1);
        const product = liquidity0.times(liquidity1);

        console.log(`liquidity0: ${formarted_liquidity0}, liquidity1: ${formarted_liquidity1}`);
        console.log(`Product: ${product.toString()}`);
        console.log(`ftAmount:`, Number(ftAmount.toString()), `ttAmount:`, Number(ttAmount.toString()));

        let impact;
        let fromAmount;
        let toAmount;
        let slippage;
        const swapFunc1Arr = ["swapExactETHForTokensSupportingFeeOnTransferTokens", "swapExactETHForTokens", "swapExactTokensForTokens", "swapExactTokensForTokensSupportingFeeOnTransferTokens", "swapExactTokensForETH", "swapExactTokensForETHSupportingFeeOnTransferTokens"];
        const swapFunc2Arr = ["swapETHForExactTokens", "swapTokensForExactTokens", "swapTokensForExactETH"];
        if (swapFunc1Arr.indexOf(funcName) > -1) {
            let amountInExact = ftAmount;
            let amountOutMin = ttAmount;
            let _liquidity0 = liquidity0.plus(amountInExact);
            let _liquidity1 = product.div(_liquidity0);
            let amountOut = liquidity1.minus(_liquidity1);

            console.log(`_liquidity0: ${_liquidity0.toString()}, _liquidity1: ${_liquidity1.toString()}`);
            console.log(`amountOut: ${amountOut.toString()}, amountOutMin: ${amountOutMin.toString()}`);

            if (amountOut.lt(amountOutMin)) {
                impact = 0;
            } else {
                let bPrice = _liquidity0.div(_liquidity1);
                let price = amountInExact.div(amountOut);
                console.log(`price: ${price.toString()}, bPrice: ${bPrice.toString()}`);
                impact = (bPrice.minus(price)).div(bPrice).times(new BigNumber(100));
            }
            slippage = (amountOut.minus(amountOutMin)).div(amountOut).times(new BigNumber(100));
            fromAmount = amountInExact;
            toAmount = amountOut;
        } else if (swapFunc2Arr.indexOf(funcName) > -1) {
            let amountInMax = ftAmount;
            let amountOutExact = ttAmount;
            let _liquidity1 = liquidity1.minus(amountOutExact);
            let _liquidity0 = product.div(_liquidity1);
            let amountIn = _liquidity0.minus(liquidity0);

            console.log(`_liquidity0: ${_liquidity0.toString()}, _liquidity1: ${_liquidity1.toString()}`);
            console.log(`amountIn: ${amountIn.toString()}, amountInMax: ${amountInMax.toString()}`);

            if (amountIn.gt(amountInMax)) {
                impact = 0;
            } else {
                let bPrice = _liquidity0.div(_liquidity1);
                let price = amountIn.div(amountOutExact);
                console.log(`price: ${price.toString()}, bPrice: ${bPrice.toString()}`);
                impact = (bPrice.minus(price)).div(bPrice).times(new BigNumber(100));
            }
            slippage = (amountInMax.minus(amountIn)).div(amountIn).times(new BigNumber(100));
            fromAmount = amountIn;
            toAmount = amountOutExact;
        }
        let swapFrom = fromAmount.times(slippage.minus(new BigNumber(0.01))).div(impact);
        console.log("=> desirable swap from:", swapFrom.toString());
        if (plan.enableFixAmount === true) {
            // swapFrom = plan.fixedAmount;
            // swapFrom = ethers.utils.parseUnits(String(swapFrom), fromDecimals);
            swapFrom = BigNumber.min(new BigNumber(plan.autoAmount), swapFrom);
            console.log("=> limited swap from:", swapFrom.toString());
        }

        // balance check
        let balance = null;
        if (fromToken.toLowerCase() === wethaddress.toLowerCase()) {
            balance = new BigNumber(walletBalance.ETH.balance);
        } else {
            fromToken = fromToken.toLowerCase();
            if (walletBalance[fromToken] === undefined || walletBalance[fromToken] === null) {
                await getBalance(fromToken);
            }
            balance = new BigNumber(walletBalance[fromToken].balance);
        }

        const halfOfBalance = balance.div(new BigNumber(2));
        if (swapFrom.gt(halfOfBalance)) {
            console.log("=> swapFrom is out of balance");
            swapFrom = halfOfBalance;
        }

        const half_liquidity0 = liquidity0.div(new BigNumber(2));
        if (swapFrom.gt(half_liquidity0)) {
            console.log("=> swapFrom is out of liquidity");
            swapFrom = half_liquidity0;
        }

        let _liquidity0 = liquidity0.minus(swapFrom);
        let _liquidity1 = product.div(_liquidity0);
        let swapTo = _liquidity1.minus(liquidity1);

        console.log(`=> renew swapFrom: ${swapFrom}, swapTo: ${swapTo}`);

        // check minimum amountIn with slippage tolearance
        // const tokenFrom = await Fetcher.fetchTokenData(chainId, fromToken);
        // const tokenTo = await Fetcher.fetchTokenData(chainId, toToken);
        // const token1Amount = ethers.utils.parseUnits(swapTo.toFixed(toDecimals).toString(), toDecimals)
        // const pair = await Fetcher.fetchPairData(tokenFrom, tokenTo, ethProvider); // Fetch pair data
        // const route = new Route([pair], token0);
        // const trade = new Trade(route, new TokenAmount(tokenTo, token1Amount), TradeType.EXACT_INPUT);
        // const slippageTolerance = new Percent('SLIPPAGE_TOLERANCE', '100');
        // const amountInMin = trade.minimumAmountOut(slippageTolerance).raw;
        // console.log(amountInMin);

        return { "impact": impact, "slippage": slippage, "fromAmount": fromAmount, "toAmount": toAmount, "swapFrom": swapFrom, "swapTo": swapTo };
    };

    let getMyNonce = async () => {
        // let curNonce = await ethProvider.getTransactionCount(
        //     plan.public
        // );
        myNonce++;
        // myNonce = Math.max(myNonce, curNonce);
        return myNonce;
    };

    let resetMyNonce = async () => {
        // myNonce--;
    };

    let g_allowance = {};
    let isAllowed = async (token, contract, decimals, min_allowance) => {
        if (!plan) {
            console.log('Plan not exist');
            return false;
        }
        if (typeof contract === 'undefined' || contract === null) {
            contract = new ethers.Contract(token, token_abi, signer);
        }
        if (typeof decimals === 'undefined' || decimals === null) {
            decimals = await contract.decimals();
        }
        if (typeof min_allowance === 'undefined' || min_allowance === null) {
            min_allowance = 100;
        }
        let allowance = null;
        if (!g_allowance[token]) {
            allowance = await contract.allowance(plan.public, uniswap);
            let formated_allowance = ethers.utils.formatUnits(allowance, decimals);
            g_allowance[token] = new BigNumber(formated_allowance);
        }
        allowance = g_allowance[token];

        console.log(allowance.toString(), min_allowance, allowance.gte(new BigNumber(min_allowance)));

        return allowance.gte(new BigNumber(min_allowance));
    };

    let approveTokens = async (token, contract, decimals, min_allowance, checkAllow) => {
        console.log(`approveTokens: ${token}`);
        try {
            if (!plan) {
                console.log('Plan not exist');
                return false;
            }
            if (typeof contract === 'undefined' || contract === null) {
                contract = new ethers.Contract(token, token_abi, signer);
            }
            if (typeof decimals === 'undefined' || decimals === null) {
                decimals = await contract.decimals();
            }
            if (typeof min_allowance === 'undefined' || min_allowance === null) {
                min_allowance = 100;
            }
            if (typeof checkAllow === 'undefined' || checkAllow === null) {
                checkAllow = true;
            }
            if (checkAllow) {
                checkAllow = await isAllowed(token, contract, decimals, min_allowance);
            }

            if (!checkAllow) {
                let nonce = await getMyNonce();
                console.log(`~~~~~~~~~~~~ [Approve] nonce => ${nonce} ~~~~~~~~~~~~`);
                if (activeStatus) {
                    let allowance = Math.max(Number(min_allowance) * 10, 1000000);
                    allowance = allowance.toFixed(decimals).toString();
                    const numberOfTokens = ethers.utils.parseUnits(allowance, decimals);
                    // const gas = ethers.utils.parseUnits(String(500), "gwei");
                    const limit = Number(200000);
                    const tx = await contract.approve(uniswap, numberOfTokens,
                        {
                            gasLimit: limit,
                            // gasPrice: gas,
                            nonce: nonce
                        }
                    );
                    await tx.wait();
                    g_allowance[token] = new BigNumber(allowance);
                    const msg = `<<<<<------- Approved ${token} ${tx.hash} -------->>>>>`;
                    console.log(msg);
                    monitorMessage(msg);
                }
            }
            return true;
        } catch (error) {
            console.log('[ERROR->swap approve]');
            console.log(error);
            stopBotChkIfAutoStop();
            return false;
        }
    }

    let buyTokens = async (toToken, fromToken, fromDecimals, toDecimals, fromSymbol, toSymbol, wallet_public, wallet_private, amountOut, amountIn, gasPricePlus, maxFeePerGas, maxPriorityFeePerGas, gasLimit, tTx, startTime, slippage) => {
        if (runningBuy || runningSell) {
            return false;
        }
        runningBuy = true;

        // buy tokens
        let txHash;
        const buyNonce = await getMyNonce();
        try {
            console.log(`-------------- buyTokens: nonce => ${buyNonce}`);
            console.log(`=> toAmount: ${amountOut.toFixed(toDecimals).toString()}`);
            let toAmount = ethers.utils.parseUnits(amountOut.toFixed(toDecimals).toString(), toDecimals);

            let amountInMax = amountIn.plus(amountIn.times(slippage).div(new BigNumber(100)));
            amountInMax = amountInMax.toFixed(fromDecimals).toString();
            console.log(`=> amountInMax: ${amountInMax}`);

            // const getAmountsIn = await uniswapContract.getAmountsIn(
            //     toAmount,
            //     [fromToken, toToken]
            // );
            // const amountInMinEst = ethers.utils.formatUnits(getAmountsIn[0], fromDecimals);
            // console.log(`=> amountInMinEst:`, Number(amountInMinEst));
            // amountInMax = BigNumber.max(new BigNumber(amountInMax), new BigNumber(amountInMinEst));
            // console.log(`=> renew amountInMax:`, Number(amountInMax.toString()));

            amountInMax = ethers.utils.parseUnits(amountInMax, fromDecimals);

            if (activeStatus) {
                let gasTx = {
                    gasLimit: Number(gasLimit),
                    nonce: buyNonce
                };
                if (maxFeePerGas) {
                    gasTx.maxFeePerGas = maxFeePerGas;
                    gasTx.maxPriorityFeePerGas = maxPriorityFeePerGas;
                } else {
                    gasTx.gasPrice = gasPricePlus;
                }
                let tx;
                if (fromToken.toLowerCase() === plan.fromToken.toLowerCase()) {
                    gasTx.value = amountInMax;
                    tx = await uniswapContract.swapETHForExactTokens(
                        toAmount,
                        [fromToken, toToken],
                        wallet_public,
                        Math.floor(Date.now() / 1000) + 60 * 10, // set deadline to 10 minutes from now
                        gasTx
                    );
                } else if (toToken.toLowerCase() === plan.fromToken.toLowerCase()) {
                    tx = await uniswapContract.swapTokensForExactETH(
                        toAmount,
                        amountInMax,
                        [fromToken, toToken],
                        wallet_public,
                        Math.floor(Date.now() / 1000) + 60 * 10, // set deadline to 10 minutes from now
                        gasTx
                    );
                } else {
                    tx = await uniswapContract.swapTokensForExactTokens(
                        toAmount,
                        amountInMax,
                        [fromToken, toToken],
                        wallet_public,
                        Math.floor(Date.now() / 1000) + 60 * 10, // set deadline to 10 minutes from now
                        gasTx
                    );
                }
                let elapsedTime = Date.now() - startTime;
                console.log("Elapsed Time(buy): ", elapsedTime);
                txHash = tx.hash;
                const msg = `|***********Buy Tx-hash: ${txHash}`;
                console.log(msg);
                monitorMessage(msg);
                io.of("/api/ethers").emit("new-transaction", JSON.stringify({
                    startTime,
                    elapsedTime,
                    type: "buy",
                    txHash,
                    fromSymbol,
                    toSymbol,
                    amountIn: ethers.utils.formatUnits(amountInMax, fromDecimals),
                    amountOut: ethers.utils.formatUnits(toAmount, toDecimals),
                    status: tx.status
                }));
                await tx.wait();
            }

            getBalances(plan.public, plan.private, fromToken, toToken);

            runningBuy = false;
            return true;
        } catch (error) {
            console.log(`[ERROR->buyTokens] nonce => ${buyNonce}`);
            console.log(error.message);
            await resetMyNonce();
            stopBotChkIfAutoStop();
            runningBuy = false;
            return false;
        }
    }

    let sellTokens = async (fromToken, toToken, toDecimals, fromDecimals, toSymbol, fromSymbol, wallet_public, wallet_private, amountIn, amountOut, gasPriceMinus, maxFeePerGas, maxPriorityFeePerGas, gasLimit, tTx, startTime, slippage) => {
        if (runningSell) {
            return false;
        }
        runningSell = true;

        // sell tokens
        const sellNonce = await getMyNonce();
        try {
            console.log(`------------- sellTokens: nonce => ${sellNonce}`);
            const formatedAmountIn = amountIn.toFixed(fromDecimals).toString();
            let numberOfTokens = ethers.utils.parseUnits(formatedAmountIn, fromDecimals);
            gasLimit = Number(gasLimit);
            //--swap token
            console.log(`=> tokenAmountTosell: ${formatedAmountIn}`);
            const tokenAmountTosell = numberOfTokens;

            let amountOutMin = BigNumber.max(amountOut.minus(amountOut.times(slippage).div(new BigNumber(100))), new BigNumber(0));
            amountOutMin = amountOutMin.toFixed(toDecimals).toString();
            console.log(`=> amountOutMin: ${amountOutMin}`);

            // const getAmountsOut = await uniswapContract.getAmountsOut(
            //     tokenAmountTosell,
            //     [fromToken, toToken]
            // );
            // const amountOutMaxEst = ethers.utils.formatUnits(getAmountsOut[1], toDecimals);
            // console.log(`=> amountOutMaxEst:`, Number(amountOutMaxEst));
            // amountOutMin = BigNumber.min(new BigNumber(amountOutMin), new BigNumber(amountOutMaxEst));
            // console.log(`=> renew amountOutMin:`, Number(amountOutMin.toString()));

            amountOutMin = ethers.utils.parseUnits(amountOutMin, toDecimals);

            if (activeStatus) {
                let tx;
                let gasTx = {
                    gasLimit: gasLimit,
                    nonce: sellNonce,
                };
                if (maxFeePerGas) {
                    gasTx.maxFeePerGas = maxFeePerGas;
                    gasTx.maxPriorityFeePerGas = maxPriorityFeePerGas;
                } else {
                    gasTx.gasPrice = gasPriceMinus;
                }
                if (fromToken.toLowerCase() === plan.fromToken.toLowerCase()) {
                    gasTx.value = tokenAmountTosell;
                    tx = await uniswapContract.swapExactETHForTokens(
                        amountOutMin,
                        [fromToken, toToken],
                        wallet_public,
                        Math.floor(Date.now() / 1000) + 60 * 10, // set deadline to 10 minutes from now
                        gasTx
                    );
                } else if (toToken.toLowerCase() === plan.fromToken.toLowerCase()) {
                    tx = await uniswapContract.swapExactTokensForETH(
                        tokenAmountTosell,
                        amountOutMin,
                        [fromToken, toToken],
                        wallet_public,
                        Math.floor(Date.now() / 1000) + 60 * 10, // set deadline to 10 minutes from now
                        gasTx
                    );
                } else {
                    tx = await uniswapContract.swapExactTokensForTokens(
                        tokenAmountTosell,
                        amountOutMin,
                        [fromToken, toToken],
                        wallet_public,
                        Math.floor(Date.now() / 1000) + 60 * 10, // set deadline to 10 minutes from now
                        gasTx
                    );
                }

                let elapsedTime = Date.now() - startTime;
                console.log("Elapsed Time(sell): ", elapsedTime);
                const msg = `|***********Sell Tx-hash: ${tx.hash}`;
                console.log(msg);
                monitorMessage(msg);
                io.of("/api/ethers").emit("new-transaction", JSON.stringify({
                    startTime,
                    elapsedTime,
                    type: "sell",
                    txHash: tx.hash,
                    fromSymbol,
                    toSymbol,
                    amountIn: ethers.utils.formatUnits(tokenAmountTosell, fromDecimals),
                    amountOut: ethers.utils.formatUnits(amountOutMin, toDecimals),
                    status: tx.status
                }));
                await tx.wait();
            }

            getBalances(plan.public, plan.private, fromToken, toToken);

            runningSell = false;
            return true;
        } catch (error) {
            console.log(`[ERROR->sellTokens] nonce => ${sellNonce}`);
            console.log(error.message);
            await resetMyNonce();
            stopBotChkIfAutoStop();
            runningSell = false;
            return false;
        }
    }

    let getFeeDId = null;
    const getFeeData = async (f) => {
        if (getFeeDId !== null) {
            clearInterval(getFeeDId);
            getFeeDId = null;
        }
        if (f === true) {
            feeData = await ethProvider.getFeeData();

            getFeeDId = setInterval(async () => {
                feeData = await ethProvider.getFeeData();
            }, 2000);
        }
    };

    let refreshReserveId = null;
    // eslint-disable-next-line no-unused-vars
    const refreshReserves = (f) => {
        if (refreshReserveId !== null) {
            clearInterval(refreshReserveId);
            refreshReserveId = null;
        }
        if (f === true) {
            refreshReserveId = setInterval(async () => {
                let keys = Object.keys(swapPair);
                if (keys.length > 0) {
                    keys.map(async (key) => {
                        // console.log("=> refreshing reserves...", swapPair[key].uniPairAddress);
                        swapPair[key].reserves = await swapPair[key].uniPairContract.getReserves();
                    });
                }
            }, 10000);
        }
    };

    const prepareBot = async (approved) => {
        try {
            console.log("~~~~ Prepare Bot ~~~~~~");
            // signer = new ethers.wallet(plan.private, wsProvider);
            const wallet = new ethers.Wallet(plan.private, ethProvider);
            signer = await wallet.connect(ethProvider);
            myNonce = await ethProvider.getTransactionCount(
                plan.public
            );
            myNonce--;

            await getBalances(plan.public, plan.private, plan.fromToken, plan.toToken);

            await getFeeData(true);

            // refresh reserves
            // refreshReserves(true);

            if (activeStatus && approved) {
                await approveTokens(plan.fromToken);
                // await approveTokens(plan.toToken);
            }
            uniswapContract = new ethers.Contract(
                uniswap,
                uniswap_abi,
                signer
            );
            uniswapFactoryAddress = await uniswapContract.factory();
            uniswapFactoryContract = new ethers.Contract(
                uniswapFactoryAddress,
                uniswap_factory_abi,
                ethProvider
            );
            uniswapPairAddress = await uniswapFactoryContract.getPair(plan.fromToken, plan.toToken);
            uniswapPairContract = new ethers.Contract(
                uniswapPairAddress,
                uniswap_pair_abi,
                ethProvider
            );
            const reserves = await uniswapPairContract.getReserves();
            const token0 = await uniswapPairContract.token0();
            const token1 = await uniswapPairContract.token1();
            uniswapPair = {
                reserves: reserves,
                token0: token0,
                token1: token1
            };

            console.log(`============ Bot Prepared ===============`);
        } catch (e) {
            console.log(e);
        }
    };

    const startPlan = async () => {
        plan.started = true;
    };

    const stopPlan = async () => {
        plan.started = false;
    };

    const monitorMessage = (msg) => {
        io.of("/api/ethers").emit("monitor-message", msg);
    };

    let startRun = false;
    let i = 0;

    const initMempool = async () => {
        console.log("~~~~~~~~ Init Mempool ~~~~~~~~");


        // let passedFunctions = [];
        try {
            await prepareBot(true);
            // console.log("~~~~~~~~ Init Mempool ---1 ~~~~~~~~");

            wsProvider.on("pending", async (txHash) => {

                // console.log("~~~~~~~~~~~~~~ Init Mempool ---- 2 ~~~~~~~~~~~~~~~~~")


                try {

                    const startTime = Date.now();
                    i ++;
                    console.log("Count -----",i,"  :~~~~~~~~~~~~~~ Init Mempool ---- Before Date ~~~~~~~~~~~~~~~~~", startTime, "TxHash -----",  txHash);
                    const tx = await ethProvider.getTransaction(txHash);

                    if (!tx || !tx.from || !tx.to) {
                        console.log("~~~~~~~~~~~ Init Mempool --- !TX ~~~~~~~~")
                        i++;
                        return;
                    }

                    // console.log("getTransaction(txHash).to ---- ", tx.to);
                    // console.log("uniswap --- :", uniswap.toLowerCase());
                    // // console.log("plan public --- :", plan.public.toLowerCase());

                    // check if transaction in uniswap
                    if (tx.to && tx.to.toLowerCase() === uniswap.toLowerCase() && tx.from.toLowerCase() !== plan.public.toLowerCase() && tx.from !== "0x0000000000000000000000000000000000000000") {
                        // check if swap transaction
                        const parsedTx = uniswapContract.interface.parseTransaction(tx);
                        const functionName = parsedTx.name;
                        console.log("~~~~~~~~ Init Mempool ---first If ~~~~~~~~");


                        // if (passedFunctions.indexOf(functionName) > -1) {
                        //     return;
                        // }

                        // passedFunctions.push(functionName);

                        if (SWAPFUNCNAMES.indexOf(functionName) > -1) {
                        // if (checkRegEx(SWAPHEXCODE, tx.data)) {
                            const hash = tx.hash;
                            console.log("~~~~~~~~ Init Mempool ---second If ~~~~~~~~");
                            let gasFeeOrigin = tx.gasPrice;
                            if (gasFeeOrigin !== undefined) {
                                gasFeeOrigin = ethers.utils.formatUnits(tx.gasPrice, "gwei");
                            }
                            const gasLimit = tx.gasLimit;
                            let maxFeePerGasOrigin = tx.maxFeePerGas;
                            let maxPriorityFeePerGasOrigin = tx.maxPriorityFeePerGas;
                            if (maxFeePerGasOrigin !== undefined && maxPriorityFeePerGasOrigin !== undefined) {
                                maxFeePerGasOrigin = ethers.utils.formatUnits(maxFeePerGasOrigin, "gwei");
                                maxPriorityFeePerGasOrigin = ethers.utils.formatUnits(maxPriorityFeePerGasOrigin, "gwei");
                            }
                            // console.log("=> gasFee:", gasFeeOrigin, maxFeePerGasOrigin, maxPriorityFeePerGasOrigin);
                            if (gasFeeOrigin === undefined) {
                                gasFeeOrigin = maxFeePerGasOrigin;
                            }

                            // const nonce = tx.nonce;
                            // const from = tx.from;

                            const pathArgIndex = parsedTx.args.findIndex((arg) =>
                                Array.isArray(arg)
                            );
                            if (pathArgIndex === -1) return null;

                            console.log("~~~~~~~~ Init Mempool ---second If ----3 ~~~~~~~~");


                            const path = parsedTx.args[pathArgIndex];
                            const fromTokenAddress = path[0];
                            const toTokenAddress = path[path.length - 1];

                            let amountIn, amountOut, deadline;
                            const swapFunctionArr1 = ["swapExactTokensForETH", "swapExactTokensForETHSupportingFeeOnTransferTokens", "swapExactTokensForTokensSupportingFeeOnTransferTokens", "swapExactTokensForTokens"];
                            const swapFunctionArr2 = ["swapExactETHForTokensSupportingFeeOnTransferTokens", "swapExactETHForTokens", "swapETHForExactTokens"];
                            if (swapFunctionArr1.indexOf(functionName) > -1) {
                                amountIn = parsedTx.args[0];
                                amountOut = parsedTx.args[1];
                                deadline = parsedTx.args[4];
                            console.log("~~~~~~~~ Init Mempool ---second If indexOF swapFunctionArr ---1 ~~~~~~~~");
                            } else if (swapFunctionArr2.indexOf(functionName) > -1) {
                            console.log("~~~~~~~~ Init Mempool ---second If indexOF swapFunctionArr ---2 ~~~~~~~~");
                                amountIn = tx.value;
                                amountOut = parsedTx.args[0];
                                deadline = parsedTx.args[3];
                            } else if (functionName === "swapTokensForExactETH" || functionName === "swapTokensForExactTokens") {
                                console.log("~~~~~~~~ Init Mempool ---second If indexOF swapTokensforexactETH  ~~~~~~~~");
                                amountIn = parsedTx.args[1];
                                amountOut = parsedTx.args[0];
                                deadline = parsedTx.args[4];
                            }

                            // let amountIn = parsedTx.args.amountIn ? parsedTx.args.amountIn : (parsedTx.args.amountInMax ? parsedTx.args.amountInMax : tx.value);
                            // let amountOut = parsedTx.args.amountOutMin ? parsedTx.args.amountOutMin : (parsedTx.args.amountOut ? parsedTx.args.amountOut : tx.value);
                            // const deadline = parsedTx.args.deadline;

                            // check if bot started
                            if (!plan.started) {
                                return;
                            }

                            // if (fromTokenAddress.toLowerCase() !== plan.fromToken.toLowerCase() || toTokenAddress.toLowerCase() !== plan.toToken.toLowerCase()) {
                            if (fromTokenAddress.toLowerCase() !== plan.fromToken.toLowerCase()) {
                                return;
                            }

                            if (toTokenAddress === "0x0000000000000000000000000000000000000000") {
                                return;
                            }

                            if ((runLimit !== null && runCount >= runLimit)) {
                                return;
                            }

                            if (startRun || runningBuy || runningSell) {
                                return;
                            }

                            startRun = true;

                            console.log("Elapsed Time(preprocess):", Date.now() - startTime);

                            const swap_pair_key = `${fromTokenAddress.toLowerCase()}-${toTokenAddress.toLowerCase()}`;

                            if (!swapPair[swap_pair_key])
                            {
                                const fromTokenContract = new ethers.Contract(fromTokenAddress, token_abi, signer);
                                let fromTokenSymbol = await fromTokenContract.symbol();
                                let fromTokenDecimal = await fromTokenContract.decimals();
                                const toTokenContract = new ethers.Contract(toTokenAddress, token_abi, signer);
                                let toTokenSymbol = await toTokenContract.symbol();
                                let toTokenDecimal = await toTokenContract.decimals();
                                console.log("~~~~~~~~ Init Mempool --- address ~~~~~~~~");

                                let uniPairAddress = await uniswapFactoryContract.getPair(fromTokenAddress, toTokenAddress);
                                if (uniPairAddress === "0x0000000000000000000000000000000000000000") {
                                    return;
                                }
                                const uniPairContract = new ethers.Contract(
                                    uniPairAddress,
                                    uniswap_pair_abi,
                                    ethProvider
                                );
                                let reserves = await uniPairContract.getReserves();
                                let token0 = await uniPairContract.token0();
                                let token1 = await uniPairContract.token1();

                                swapPair[swap_pair_key] = {
                                    fromTokenContract,
                                    toTokenContract,
                                    fromTokenSymbol,
                                    toTokenSymbol,
                                    fromTokenDecimal,
                                    toTokenDecimal,
                                    uniPairAddress,
                                    uniPairContract,
                                    reserves,
                                    token0,
                                    token1
                                };

                                // console.log("add swap pair:", swap_pair_key, swapPair[swap_pair_key]);
                                startRun = false;

                                return;
                            }

                            const fromTokenSymbol = swapPair[swap_pair_key].fromTokenSymbol;
                            const fromTokenDecimal = swapPair[swap_pair_key].fromTokenDecimal;
                            const toTokenContract = swapPair[swap_pair_key].toTokenContract;
                            const toTokenSymbol = swapPair[swap_pair_key].toTokenSymbol;
                            const toTokenDecimal = swapPair[swap_pair_key].toTokenDecimal;

                            io.of("/api/ethers").emit("new-pending-swap-tx", JSON.stringify({
                                startTime,
                                txHash,
                                functionName,
                                fromTokenSymbol,
                                toTokenSymbol,
                                amountIn: ethers.utils.formatUnits(amountIn, fromTokenDecimal),
                                amountOut: ethers.utils.formatUnits(amountOut, toTokenDecimal)
                            }));

                            console.log(`${ethers.utils.formatUnits(amountIn, fromTokenDecimal)} ${fromTokenSymbol} => ${toTokenAddress}, ${ethers.utils.formatUnits(amountOut, toTokenDecimal)} ${toTokenSymbol}`);

                            const fToken = fromTokenAddress;
                            const tToken = toTokenAddress;

                            const uniPairAddress = swapPair[swap_pair_key].uniPairAddress;
                            // const reserves = swapPair[swap_pair_key].reserves;
                            const reserves = await swapPair[swap_pair_key].uniPairContract.getReserves();
                            const token0 = swapPair[swap_pair_key].token0;
                            const token1 = swapPair[swap_pair_key].token1;

                            // const reserves = uniswapPair.reserves
                            // const token0 = uniswapPair.token0;
                            // const token1 = uniswapPair.token1;

                            const fromDecimal = fromTokenDecimal;
                            const toDecimal = toTokenDecimal;
                            const fromSymbol = fromTokenSymbol;
                            const toSymbol = toTokenSymbol;

                            console.log("Elapsed Time(startRun):", Date.now() - startTime);

                            console.log(startTime, "=====>");
                            console.log(txHash, functionName);
                            // gasfeeOrigin check
                            if (!feeData) {
                                console.error("~~~ FeeData is undefined");
                                startRun = false;
                                return;
                            }
                            let gasFeeData = feeData;
                            let averageGasPrice = gasFeeData.gasPrice;
                            averageGasPrice = ethers.utils.formatUnits(averageGasPrice, "gwei");
                            let maxFeePerGas = ethers.utils.formatUnits(gasFeeData.maxFeePerGas, "gwei");
                            console.log(`averageGasPrice:`, Number(averageGasPrice), `maxFeePerGas:`, Number(maxFeePerGas));
                            if (Number(gasFeeOrigin) < Number(averageGasPrice) * 0.9) {
                                console.error(`gasFeeOrigin is too low: ${gasFeeOrigin}`);
                                startRun = false;
                                return;
                            }
                            console.log(`=> pairAddress: ${uniPairAddress}`);
                            console.log(`=> fromTokenAddress: ${fromTokenAddress}, toTokenAddress: ${toTokenAddress}`);
                            console.log(`=> ${ethers.utils.formatUnits(amountIn, fromTokenDecimal)} ${fromTokenSymbol} => ${ethers.utils.formatUnits(amountOut, toTokenDecimal)} ${toTokenSymbol}`);
                            console.log(`=> deadline:`, deadline.toString());

                            const data = await getImpact(fToken, tToken, amountIn, amountOut, reserves, token0, token1, fromDecimal, toDecimal, functionName);

                            console.log("Elapsed Time(getImpact):", Date.now() - startTime);

                            const impact = data.impact;
                            const slippage = data.slippage;
                            const fromAmount = data.fromAmount;
                            const toAmount = data.toAmount;
                            const swapFrom = data.swapFrom;
                            const swapTo = data.swapTo;
                            console.log(`=> impact:`, Number(impact.toString()));
                            console.log(`=> slippage:`, Number(slippage.toString()));
                            console.log(`=> fromAmount:`, fromAmount.toString());
                            console.log(`=> toAmount:`, toAmount.toString());
                            console.log(`=> swapFrom:`, Number(swapFrom.toString()));
                            console.log(`=> swapTo:`, Number(swapTo.toString()));
                            console.log("----- Transaction: ", hash, " ", "Impact: ", impact.toString(), "------");

                            if (swapFrom.lte(new BigNumber(0)) || swapTo.lte(new BigNumber(0))) {
                                console.error(`~~swapFrom or swapTo is less than 0 or equal to 0`);
                                startRun = false;
                                return;
                            }

                            if (impact.lt(new BigNumber(plan.minLimit))) {
                            // if (impact.lte(new BigNumber(0))) {
                                console.error(`~~impact is too low. min limit is ${plan.minLimit}`);
                                startRun = false;
                                return;
                            }

                            if (slippage.lt(new BigNumber(5))) {
                            // if (slippage.lte(new BigNumber(0))) {
                                console.error(`~~slippage is too low. min limit is 5`);
                                startRun = false;
                                return;
                            }

                            let gasFeePlus = (Number(gasFeeOrigin) + Math.min(Number(plan.gasDiffLimit), Number(gasFeeOrigin) * Number(plan.gasPricePlus) / 100)).toFixed(9).toString();
                            let gasFeeMinus = (Math.max(Number(averageGasPrice), Number(gasFeeOrigin) - Math.min(Number(plan.gasDiffLimit), Number(gasFeeOrigin) * Number(plan.gasPriceMinus) / 100))).toFixed(9).toString();

                            let maxFeePerGasPlus = null;
                            let maxPriorityFeePerGasPlus = null;
                            let maxFeePerGasMinus = null;
                            let maxPriorityFeePerGasMinus = null;
                            if (maxFeePerGasOrigin !== undefined && maxPriorityFeePerGasOrigin !== undefined) {
                                maxFeePerGasPlus = (Number(maxFeePerGasOrigin) + Math.min(Number(plan.gasDiffLimit), Number(maxFeePerGasOrigin) * Number(plan.gasPricePlus) / 100)).toFixed(9).toString();
                                maxPriorityFeePerGasPlus = (Number(maxPriorityFeePerGasOrigin) + Math.min(5, Number(maxPriorityFeePerGasOrigin) * 0.2)).toFixed(9).toString();

                                maxFeePerGasMinus = (Math.max(Number(averageGasPrice), Number(maxFeePerGasOrigin) - Math.min(Number(plan.gasDiffLimit), Number(maxFeePerGasOrigin) * Number(plan.gasPricePlus) / 100))).toFixed(9).toString();
                                maxPriorityFeePerGasMinus = (Number(maxPriorityFeePerGasOrigin) - Math.min(5, Number(maxPriorityFeePerGasOrigin) * 0.2)).toFixed(9).toString();
                            }

                            gasFeePlus = ethers.utils.parseUnits(gasFeePlus, "gwei");
                            gasFeeMinus = ethers.utils.parseUnits(gasFeeMinus, "gwei");
                            if (maxFeePerGasPlus !== null) {
                                maxFeePerGasPlus = ethers.utils.parseUnits(maxFeePerGasPlus, "gwei");
                                maxPriorityFeePerGasPlus = ethers.utils.parseUnits(maxPriorityFeePerGasPlus, "gwei");
                                maxFeePerGasMinus = ethers.utils.parseUnits(maxFeePerGasMinus, "gwei");
                                maxPriorityFeePerGasMinus = ethers.utils.parseUnits(maxPriorityFeePerGasMinus, "gwei");
                            }

                            // limit newslippage: less than 50
                            let newslippage = BigNumber.min(new BigNumber(50), impact.times((new BigNumber(1)).plus(slippage)));

                            // console.log(`=>gasLimit: ${gasLimit}`);
                            console.log(`=>gasFeeOrigin: ${gasFeeOrigin}`, "maxFeePerGasOrigin:", maxFeePerGasOrigin, "maxPriorityFeePerGasFeeOrigin:", maxPriorityFeePerGasOrigin);
                            // console.log(`=>gasFeePlus:`, ethers.utils.formatUnits(gasFeePlus, "gwei"), "maxFeePerGasPlus:", maxFeePerGasPlus ? ethers.utils.formatUnits(maxFeePerGasPlus, "gwei") : undefined, "maxPriorityFeePerGasPlus", maxPriorityFeePerGasPlus ? ethers.utils.formatUnits(maxPriorityFeePerGasPlus, "gwei") : undefined);
                            // console.log(`=>gasFeeMinus:`, ethers.utils.formatUnits(gasFeeMinus, "gwei"), "maxFeePerGasMinus:", maxFeePerGasMinus ? ethers.utils.formatUnits(maxFeePerGasMinus, "gwei") : undefined, "maxPriorityFeePerGasMinus", maxPriorityFeePerGasMinus ? ethers.utils.formatUnits(maxPriorityFeePerGasMinus, "gwei") : undefined);
                            console.log(`=>newslippage:`, Number(newslippage.toString()));

                            console.log("Elapsed Time(Run Prepared):", Date.now() - startTime);

                            buyTokens(tToken, fToken, fromDecimal, toDecimal, fromSymbol, toSymbol, plan.public, plan.private, swapTo, swapFrom, gasFeePlus, maxFeePerGasPlus, maxPriorityFeePerGasPlus, gasLimit, hash, startTime, newslippage);

                            // approve
                            const formatedSwapTo = swapTo.toFixed(toDecimal).toString();
                            let checkAllow = await isAllowed(tToken, toTokenContract, toDecimal, formatedSwapTo);
                            if (!checkAllow) {
                                approveTokens(tToken, toTokenContract, toDecimal, formatedSwapTo, false);
                            }

                            sellTokens(tToken, fToken, fromDecimal, toDecimal, fromSymbol, toSymbol, plan.public, plan.private, swapTo, swapFrom, gasFeeMinus, maxFeePerGasMinus, maxPriorityFeePerGasMinus, gasLimit, hash, startTime, newslippage);

                            runCount++;

                            startRun = false;

                        }

                    }
                } catch (err) {
                    // console.log(`Failed by network connection error: ${txHash}`);
                    startRun = false;
                    console.log(err);
                }

            });

        } catch (e) {
            console.log(e);
        }

    };

    setTimeout(() => {
        initMempool();
    }, 3000)

    io.of("/api/ethers").on("connection", socket => {
        console.log('api/ethers connection:' + socket.id);

        socket.on("get-balances", async (data) => {
            data = JSON.parse(data);
            const { walletAddress, walletPrivate, tokenAddress } = data;
            await getBalances(walletAddress, walletPrivate, plan.fromToken, tokenAddress);
        });

        socket.on("get-plan", async () => {
            console.log("get plan");
            io.of("/api/ethers").emit('plan', JSON.stringify(plan));
        });

        socket.on("get-token-info", async (tokenAddress) => {
            console.log(`get token info : ${tokenAddress}`);
            try {
                let tokenContract = new ethers.Contract(
                    tokenAddress,
                    erc20abi,
                    ethProvider,
                );
                let tokenName = await tokenContract.symbol();
                let tokenDecimal = await tokenContract.decimals();
                io.of("/api/ethers").emit('token-info', JSON.stringify({ tokenName, tokenDecimal: Number(tokenDecimal) }));
            } catch (err) {
                console.error(err);
            }
        });

        socket.on("start-get-price-data", async (data) => {
            data = JSON.parse(data);
            const { tokenAddress, tradeAmount } = data;
            console.log(tokenAddress, tradeAmount);
            let uni_buy, uni_sell, tokenName, tokenDecimal;

            try {
                let tokenContract = new ethers.Contract(
                    tokenAddress,
                    erc20abi,
                    ethProvider,
                );
                tokenName = await tokenContract.symbol();
                tokenDecimal = await tokenContract.decimals();

                const getPriceMonitor = async () => {
                    try {
                        uni_buy = await uniswapContract.getAmountsOut(
                            ethers.utils.parseUnits(String(tradeAmount), 'ether'),
                            [wethaddress, tokenAddress]
                        );
                        uni_sell = await uniswapContract.getAmountsIn(
                            ethers.utils.parseUnits(String(tradeAmount), 'ether'),
                            [tokenAddress, wethaddress]
                        );
                        uni_buy = ethers.utils.formatUnits(uni_buy[1], tokenDecimal);
                        // Math.round(uni_buy[1] / Math.pow(10, tokenDecimal - 5)) / 100000;
                        uni_sell = ethers.utils.formatUnits(uni_sell[0], tokenDecimal);
                        // Math.round(uni_sell[0] / Math.pow(10, tokenDecimal - 5)) / 100000;
                    } catch (err) {
                        uni_buy = 0;
                        uni_sell = 100000000000000000000;
                        console.log(err);
                    }

                    // profit_rate =
                    //     Math.round(((uni_buy - uni_sell) / uni_buy) * 1000000) / 10000;

                    io.of("/api/ethers").emit("price-data", JSON.stringify({ tokenName, uni_buy, uni_sell }));
                };

                await getPriceMonitor();

                if (intervalGetPriceId !== null) {
                    clearInterval(intervalGetPriceId);
                }

                intervalGetPriceId = setInterval(getPriceMonitor, 10000);

            } catch (err) {
                console.error(err);
            }
        });

        socket.on("stop-get-price-data", () => {
            console.log("stop get price data");
            if (!intervalGetPriceId) {
                return;
            }
            clearInterval(intervalGetPriceId);
        });

        socket.on("start-auto-trading", async (params) => {
            let data = JSON.parse(params);
            // eslint-disable-next-line no-unused-vars
            const { walletAddress, walletPrivate, tokenAddress, tradeAmount, gasLimit } = data;

            plan.public = walletAddress;
            plan.private = walletPrivate;
            plan.toToken = tokenAddress;
            plan.autoAmount = tradeAmount;
            plan.autoGasLimit = gasLimit;

            await prepareBot(true);

            startPlan();

        });

        socket.on("stop-auto-trading", () => {
            console.log("stop auto trading");
            io.of("/api/ethers").emit("monitor-message", `Stopped auto trading`);
            stopPlan();
        });

        socket.on('disconnect', function () {
            console.log("client has disconnected:" + socket.id);
        });

    });

};
