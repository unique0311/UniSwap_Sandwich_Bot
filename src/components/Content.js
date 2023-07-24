import * as React from 'react';
import { useEffect, useState } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Container from '@mui/material/Container';
import socketio from 'socket.io-client';
import { useSnackbar } from 'notistack';

import Header from './HeaderBar';
// import Footer from './FooterBar';
import TradeBox from './TradeBox';
import MonitorBox from './MonitorBox';

// const walletAddress = process.env.REACT_APP_WALLET_ADDRESS;
// const walletPrivate = process.env.REACT_APP_WALLET_PRIVATE;
const WEBSOCKET_ENDPOINT = process.env.REACT_APP_WEBSOCKET_ENDPOINT;
// const impactMinLimit = process.env.REACT_APP_IMPACT_MIN_LIMIT;
// const autoAmount = process.env.REACT_APP_AUTO_AMOUNT;
// const tokenAddress = process.env.REACT_APP_TOKEN_ADDRESS;
// // const minAmount = process.env.REACT_APP_MIN_AMOUNT;
// // const maxAmount = process.env.REACT_APP_MAX_AMOUNT;
// const autoGasLimit = process.env.REACT_APP_AUTO_GAS_LIMIT;
// const autoGasValue = process.env.REACT_APP_AUTO_GAS_VALUE;
// const gasPricePlus = process.env.REACT_APP_GAS_PRICE_PLUS;
// const gasPriceMinus = process.env.REACT_APP_GAS_PRICE_MINUS;
// console.log(process.env.REACT_APP_WALLET_PRIVATE, process.env.REACT_APP_WALLET_PRIVATE, process.env.REACT_APP_TOKEN_ADDRESS);

// const uniswap_address = uniswap;

export default function Content() {

  // eslint-disable-next-line no-unused-vars
  const [socket, setSocket] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  // eslint-disable-next-line no-unused-vars
  const [ownerBalances, setOwnerBalances] = useState([]);
  const [ownerAddress, setOwnerAddress] = useState(null);
  const [ownerPrivate, setOwnerPrivate] = useState(null);
  const [tradeAmount, setTradeAmount] = useState(null);
  const [token, setToken] = useState(null);
  const [tokenName, setTokenName] = useState("");
  const [uniBuyAmount, setUniBuyAmount] = useState(null);
  const [uniSellAmount, setUniSellAmount] = useState(null);
  const [gasLimit, setGasLimit] = useState(null);
  const [gasValue, setGasValue] = useState(null);
  const [startedGetPrice, setStartedGetPrice] = useState(false);
  const [startedAutoTrading, setStartedAutoTrading] = useState(false);
  // const [pendingTxList, setPendingTxList] = useState([]);
  const [transactionList, setTransactionList] = useState([
    // {
    //   txHash: "0xa20914d5697b221d773303c000b23fbc17341c078ec51d7f3c52692bb34f7f18",
    //   amountIn: "0.01 WETH",
    //   amountOut: "1.15647155142141659 UNI"
    // }
  ]);
  const [monitorMessage, setMonitorMessage] = useState("");
  const [monitorMessages, setMonitorMessages] = useState([]);
  const [swapTxList, setSwapTxList] = useState([]);

  // useEffect(() => {
  //   setOwnerAddress(walletAddress);
  //   setOwnerPrivate(walletPrivate);
  //   setTradeAmount(autoAmount);
  //   setToken(tokenAddress);
  //   setGasLimit(autoGasLimit);
  //   setGasValue(autoGasValue);
  // }, []);

  useEffect(() => {

  }, [token]);

  useEffect(() => {
    enqueueSnackbar('Socket Connecting...', { variant: 'primary' });
    const newSocket = socketio.connect(`${WEBSOCKET_ENDPOINT}/api/ethers`, {
      transports: ['websocket']
    });
    newSocket.on('connect', () => {
      enqueueSnackbar('Socket Connection Success!', { variant: 'success' });
      setSocket(newSocket);
    });
    newSocket.on('connect_failed', () => {
      enqueueSnackbar('Socket Connection Failed!', { variant: 'error' });
    });
    newSocket.on('disconnect', () => {
      enqueueSnackbar('Socket Disconnected!', { variant: 'warning' });
      if (socket !== null) {
        socket.close();
        setSocket(null);
      }
    });
    newSocket.on("balances", handleGetBalances);
    newSocket.on("token-info", handleGetTokenInfo);
    newSocket.on("price-data", handleGetPriceData);
    newSocket.on("new-transaction", handleNewTransaction);
    newSocket.on("monitor-message", handleNewMonitorMessage);
    newSocket.on("plan", handlePlan);
    newSocket.on("new-pending-swap-tx", handleNewPendingSwapTx);

    return () => newSocket.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSocket]);

  useEffect(() => {
    if (socket !== null) {
      socket.emit("get-plan");
    }
  }, [socket]);

  useEffect(() => {
    if (ownerAddress !== null && ownerPrivate !== null && token !== null && socket !== null) {
      socket.emit("get-balances", JSON.stringify({ walletAddress: ownerAddress, walletPrivate: ownerPrivate, tokenAddress: token }));
    }
  }, [ownerAddress, ownerPrivate, socket, token]);

  useEffect(() => {
     if (token !== null && socket !== null) {
      socket.emit("get-token-info", token);
     }
  }, [socket, token]);
// "literal-fs": "^1.0.5",
  const handlePlan = (data) => {
    data = JSON.parse(data);
    console.log(data);
    setStartedAutoTrading(data.started);
    setOwnerAddress(data.public);
    setOwnerPrivate(data.private);
    setTradeAmount(data.autoAmount);
    setToken(data.toToken);
    setGasLimit(data.autoGasLimit);
    setGasValue(data.autoGasValue);
  };

  const handleNewPendingSwapTx = (data) => {
    data = JSON.parse(data);
    const { startTime, txHash, functionName, fromTokenSymbol, toTokenSymbol, amountIn, amountOut } = data;
    setSwapTxList(txs => [...txs, {
      startTime,
      txHash,
      functionName,
      fromTokenSymbol,
      toTokenSymbol,
      amountIn,
      amountOut
    }].slice(-10));
    // enqueueSnackbar(`New Pending Swap Tx: ${functionName} ${amountIn}${fromTokenSymbol} => ${amountOut}${toTokenSymbol}`, { variant: 'success' });
  };

  const handleGetBalances = (balances) => {
    balances = JSON.parse(balances);
    setOwnerBalances(balances);
  };

  const handleGetTokenInfo = (data) => {
    data = JSON.parse(data);
    setTokenName(data.tokenName);
    setUniBuyAmount(null);
    setUniSellAmount(null);
  };

  const handleGetPriceData = (data) => {
    data = JSON.parse(data);
    console.log(data);
    setTokenName(data.tokenName);
    setUniBuyAmount(data.uni_buy);
    setUniSellAmount(data.uni_sell);
  };

  const handleStartGetPrice = () => {
    if (socket === null) {
      enqueueSnackbar("Socket Server Disconnected", {variant: "warning"});
      return;
    }
    // if (tradeAmount === 0) {
    //   enqueueSnackbar("Please input Trading Amount", {variant: "warning"});
    //   return;
    // }
    // if (tradeAmount < minAmount || tradeAmount > maxAmount) {
    //   enqueueSnackbar(`Trading amount should not be less than ${minAmount} and not exceed ${maxAmount}`, {variant: "warning"});
    //   return;
    // }
    // console.log("start get price data", token, tradeAmount);
    if (socket !== null) {
      socket.emit("start-get-price-data", JSON.stringify({tokenAddress: token, tradeAmount: 1}));
    }
    setStartedGetPrice(true);
  };

  const handleStopGetPrice = () => {
    console.log("stop get price data");
    if (socket !== null) {
      socket.emit("stop-get-price-data");
    }
    setStartedGetPrice(false);
  };

  const hanldeStartAutoTrading = () => {
    console.log("start auto trading");
    if (socket !== null) {
      socket.emit("start-auto-trading", JSON.stringify({
        walletAddress: ownerAddress,
        walletPrivate: ownerPrivate,
        tokenAddress: token,
        tradeAmount,
        gasLimit,
        gasValue
      }));
      setStartedAutoTrading(true);
    }
  };

  const handleStopAutoTrading = () => {
    console.log("stop auto trading");
    if (socket !== null) {
      socket.emit("stop-auto-trading");
    }
    setStartedAutoTrading(false);
    setMonitorMessage("");
  };

  const handleChangeTradeAmount = (event) => {
    const value = event.target.value;
    if (value === null) {
      return;
    }
    setTradeAmount(value);
  };

  const handleNewTransaction = (data) => {
    data = JSON.parse(data);
    const { startTime, elapsedTime, type, txHash, fromSymbol, toSymbol, amountIn, amountOut, status } = data;
    setTransactionList(transactions => [...transactions, {
      startTime,
      elapsedTime,
      type,
      txHash,
      fromSymbol,
      toSymbol,
      amountIn,
      amountOut,
      status
    }]);
    enqueueSnackbar(`New Transaction: ${type} ${amountIn}${fromSymbol} => ${amountOut}${toSymbol}`, { variant: 'success' });
  };

  const handleNewMonitorMessage = (msg) => {
    setMonitorMessage(msg);
    setMonitorMessages(messages => [...messages, msg].slice(-5));
  };

  return (
    <Box sx={{ flexGrow: 1, height: '100vh' }}>
      <Header />
      <CssBaseline />
      <Container maxWidth="xl" sx={{ mt: 2 }}>
        <Box>
          <Grid container spacing={2}>
            <Grid item xs={5}>
              <TradeBox
                balances={ownerBalances}
                token={token}
                tokenName={tokenName}
                walletAddress={ownerAddress}
                walletPrivate={ownerPrivate}
                amount={tradeAmount}
                startedGetPrice={startedGetPrice}
                handleStartGetPrice={handleStartGetPrice} 
                handleStopGetPrice={handleStopGetPrice}
                startedAutoTrading={startedAutoTrading} 
                hanldeStartAutoTrading={hanldeStartAutoTrading} 
                handleStopAutoTrading={handleStopAutoTrading} 
                handleChangeTradeAmount={handleChangeTradeAmount} 
              />
            </Grid>
            <Grid item xs={7}>
              <MonitorBox 
                tokenName={tokenName}
                uniBuyAmount={uniBuyAmount}
                uniSellAmount={uniSellAmount}
                swapTxList={swapTxList}
                transactionList={transactionList}
                monitorMessage={monitorMessage}
                monitorMessages={monitorMessages}
              />
            </Grid>
          </Grid>
        </Box>
      {/* <Footer /> */}
      </Container>
    </Box>
  );
}