// executing a new trade in the opposite direction is to take advantage of the price difference caused by the original trade. When a trade occurs in a Uniswap pool, the price of the two assets involved changes due to the effect of the Automated Market Maker (AMM) model used by Uniswap

const { ethers } = require("ethers");
const { UniswapV2Router02ABI, WETH_ADDRESS, UNISWAP_ROUTER_ADDRESS } = require("./constants");

// Connect to your Ethereum node's websocket API
// const provider = new ethers.providers.WebSocketProvider("wss://mainnet.infura.io/ws/v3/YOUR_INFURA_PROJECT_ID");
const provider = new ethers.providers.WebSocketProvider("wss://goerli.infura.io/ws/v3/74561eb373484f13b1c21c30fec5c293");

// Set up your wallet
const privateKey = "4b7ad5234f9ef49f29549b47fb722bafadd09a77afc709129b401938c86670f8";
const signer = new ethers.Wallet(privateKey, provider);

// Set up the Uniswap Router contract
const uniswapRouter = new ethers.Contract(UNISWAP_ROUTER_ADDRESS, UniswapV2Router02ABI, signer);

// Define the token pair and trade amount
const tokenIn = "0x..."; // Replace with the address of the input token
const tokenOut = "0x..."; // Replace with the address of the output token
const tradeAmount = ethers.utils.parseUnits("1", "ether");

// Define the minimum output token amount for the trade to succeed
const amountOutMin = await uniswapRouter.getAmountsOut(tradeAmount, [tokenIn, tokenOut]).then(amountsOut => amountsOut[0]);

// Set up a filter to monitor the mempool for new pending txs that match our criteria
const filter = {
    address: signer.address,
    topics: [ethers.utils.id("Swap(address,address,uint256,uint256,uint256,uint256,address,uint256)")]
};
const pendingTxs = new Map();

// Handle each new pending tx in the mempool that matches our filter
provider.on("pending", async (txHash) => {
    const tx = await provider.getTransaction(txHash);
    if (!tx || !tx.from) {
        return;
    }

    // Check if this tx matches our filter
    const txLog = tx.logs.find(log => filter.topics.includes(log.topics[0]));
    if (!txLog) {
        return;
    }

    // Check if we have already seen this tx
    if (pendingTxs.has(txHash)) {
        return;
    }

    // Mark this tx as seen
    pendingTxs.set(txHash, true);

    // Wait for the tx to be confirmed and processed
    await tx.wait();

    // Check if this tx was an outbound trade from the input token to the output token
    if (txLog.address === UNISWAP_ROUTER_ADDRESS && txLog.topics[2] === ethers.utils.id(tokenIn) && txLog.topics[3] === ethers.utils.id(tokenOut)) {
        console.log(`Outbound trade detected: tx hash ${tx.hash}, input token amount ${txLog.data}, output token amount ${txLog.topics[4]}`);

        // Execute a new trade in the opposite direction
        const amountIn = await uniswapRouter.getAmountsOut(tradeAmount, [tokenOut, tokenIn]).then(amountsOut => amountsOut[0]);
        const deadline = Math.floor(new Date().getTime() / 1000) + 60 * 20;
        const tx = await uniswapRouter.swapExactTokensForTokens(tradeAmount, amountIn, [tokenOut, tokenIn], signer.address, deadline);
        console.log(`New trade executed: tx hash ${tx.hash}`);
    }

    // Remove this tx from the list of pending txs
    pendingTxs.delete(txHash);
});

// Start listening for new blocks
provider.send("eth_subscribe", ["newHeads", {}]);