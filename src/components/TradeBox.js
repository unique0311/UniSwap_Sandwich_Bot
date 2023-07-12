
import { useRef } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import SimpleBarReact from "simplebar-react";
import { styled } from '@mui/material/styles';
import Divider from '@mui/material/Divider';
// import { Typography } from '@mui/material';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';

import 'simplebar-react/dist/simplebar.min.css';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
// import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import AccountBoxIcon from '@mui/icons-material/AccountBox';
// import ComputerIcon from '@mui/icons-material/Computer';
import FlashAutoIcon from '@mui/icons-material/FlashAuto';
// import TokenIcon from '@mui/icons-material/Token';

const Item = styled(Box)(({ theme }) => ({
    // backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
    // ...theme.typography.h6,
    padding: theme.spacing(2),
    display: "flex",
    alignItems: 'center',
    justifyContent: 'center',
    // color: theme.palette.text.secondary,
}));

export default function TradeBox({
    balances,
    tokenAddress,
    tokenName,
    walletAddress,
    walletPrivate, 
    amount,
    startedGetPrice,
    handleStartGetPrice,
    handleStopGetPrice,
    startedAutoTrading,
    hanldeStartAutoTrading,
    handleStopAutoTrading,
    handleChangeTradeAmount
}) {
    const scrollRef = useRef();

    return (
        <Box sx={{ bgcolor: '#484c54', height: "calc(100vh - 96px)", flexGrow: 1, overflow: "hidden" }}>
            <SimpleBarReact scrollableNodeProps={{ ref: scrollRef }} style={{ maxHeight: "100%" }} forceVisible="y" autoHide={true}>
                <Stack sx={{ p: 2 }} fontSize={18}>
                    <Grid container alignItems="center" justify="center">
                        <Grid item>
                            <Item>
                                <AccountBoxIcon /> &nbsp; Wallet Address and Private Key
                            </Item>
                        </Grid>
                    </Grid>
                    <Grid sx={{ pl: 2, pr: 2, pb: 2 }} container alignItems="center" justify="center">
                        <Grid item xs={6}>
                            <TextField
                                id="wallet-address"
                                value={walletAddress || ""}
                                InputProps={{
                                    readOnly: true,
                                    disabled: true
                                }}
                                fullWidth
                                size="small"
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                id="private-key"
                                value={walletPrivate || ""}
                                InputProps={{
                                    readOnly: true,
                                    disabled: true
                                }}
                                fullWidth
                                size="small"
                            />
                        </Grid>
                    </Grid>
                    <Divider />
                    <Grid container alignItems="center" justify="center">
                        <Grid item>
                            <Item>
                                <AttachMoneyIcon /> &nbsp; Wallet Balance :
                            </Item>
                        </Grid>
                    </Grid>
                    {(balances && balances.length > 0) && (
                        <List dense={true}>
                            {balances.map((val, index) => (
                                <ListItem key={index}>
                                    <ListItemText primary={val.symbol + ": " +  val.balance} />
                                </ListItem>
                            ))}
                        </List>
                    )}
                    {/* <Divider />
                    <Grid container alignItems="center" justify="center">
                        <Grid item>
                            <Item>
                                <TokenIcon /> &nbsp; Token :
                            </Item>
                        </Grid>
                        <Grid item>
                            {tokenName}
                        </Grid>
                    </Grid> */}
                    {/* <Divider />
                    <Grid container alignItems="center" justify="center">
                        <Grid item>
                            <Item>
                                <CurrencyExchangeIcon /> &nbsp; Check Price
                            </Item>
                        </Grid>
                    </Grid>
                    <Grid sx={{ pl: 2, pr: 2, pb: 2 }} container alignItems="center" justify="center">
                        <Grid item xs={6}>
                            <TextField
                                id="trading-amount-label"
                                defaultValue="Amount (ETH) : 1"
                                InputProps={{
                                    readOnly: true,
                                    disabled: true
                                }}
                                fullWidth 
                                size="small"
                            />
                        </Grid>
                        <Grid item xs={3}>
                            <TextField
                                id="trading-amount"
                                value={amount !== null ? amount : ""}
                                onChange={(event) => handleChangeTradeAmount(event)}
                                fullWidth 
                                size="small"
                            />
                        </Grid>
                        <Grid item xs={6}>
                            {!startedGetPrice ? (
                                <Button variant="outlined" fullWidth size='large' onClick={() => handleStartGetPrice()}>
                                    <ComputerIcon /> &nbsp; Get Price Data
                                </Button>
                            ) : (
                                <Button variant="contained" color="error" fullWidth size='large' onClick={() => handleStopGetPrice()}>
                                    <ComputerIcon /> &nbsp; Stop Get Price
                                </Button>
                            )}
                        </Grid>
                    </Grid> */}
                    <Divider />
                    <Grid container alignItems="center" justify="center">
                        <Grid item>
                            <Item>
                                <FlashAutoIcon /> &nbsp; Auto Trading
                            </Item>
                        </Grid>
                    </Grid>
                    <Grid sx={{ pl: 2, pr: 2, pb: 2 }} container alignItems="center" justify="center">
                        <Grid item xs={1}></Grid>
                        <Grid item xs={10}>
                            {!startedAutoTrading ? (
                                <Button variant="outlined" fullWidth size='large' onClick={() => hanldeStartAutoTrading()}>
                                    <FlashAutoIcon /> &nbsp; Start Auto Trading
                                </Button>
                            ) : (
                                <Button variant="contained" color="error" fullWidth size='large' onClick={() => handleStopAutoTrading()}>
                                    <FlashAutoIcon /> &nbsp; Stop Auto Trading
                                </Button>
                            )}
                        </Grid>
                    </Grid>
                </Stack>
            </SimpleBarReact>
        </Box>
    );
}