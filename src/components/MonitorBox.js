
import { useRef } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

import SimpleBarReact from "simplebar-react";

import 'simplebar-react/dist/simplebar.min.css';
import { Typography } from '@mui/material';

// ----------------------------------------------------------------------

// const SectionStyle = styled(Card)(({ theme }) => ({
//     width: '100%',
//     maxWidth: 464,
//     display: 'flex',
//     flexDirection: 'column',
//     justifyContent: 'center',
//     margin: theme.spacing(2, 0, 2, 2)
// }));

// const ContentStyle = styled('div')(({ theme }) => ({
//     margin: 'auto',
//     display: 'flex',
//     height: '100vh',
//     flexDirection: 'column'
// }));

// ----------------------------------------------------------------------

export default function MonitorBox({
    tokenName,
    uniBuyAmount,
    uniSellAmount,
    swapTxList,
    transactionList,
    monitorMessage,
    monitorMessages
}) {
    const scrollRef = useRef();

    return (
        <Box sx={{ bgcolor: '#484c54', height: "calc(100vh - 96px)", flexGrow: 1, overflow: "hidden" }}>
            <SimpleBarReact scrollableNodeProps={{ ref: scrollRef }} style={{ maxHeight: "100%" }} forceVisible="y" autoHide={true}>
                <Stack spacing={2} sx={{ p: 2 }}>
                    {/* <TableContainer component={Paper} sx={{ minHeight: 110 }}>
                        <Table aria-label="price table">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Token Name</TableCell>
                                    <TableCell align="right">Uni Buy Amount</TableCell>
                                    <TableCell align="right">Uni Sell Amount</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow
                                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                >
                                    <TableCell component="th" scope="row">
                                        {tokenName}
                                    </TableCell>
                                    <TableCell align="right">{uniBuyAmount || ""}</TableCell>
                                    <TableCell align="right">{uniSellAmount || ""}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer> */}

                    <TableContainer component={Paper} sx={{ 
                        minHeight: 300, 
                        maxHeight: 400 
                    }}>
                        <Table stickyHeader size="small" sx={{ width: "100%" }} aria-label="transactions table">
                            <TableHead>
                                <TableRow>
                                    <TableCell align="center">Tx Hash</TableCell>
                                    <TableCell align="center">functionName</TableCell>
                                    <TableCell align="center">Amount In/Out</TableCell>
                                    <TableCell align="center">StartTime</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {swapTxList && swapTxList.length > 0 && (
                                    swapTxList.map((val, index) => (
                                        <TableRow
                                            key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                        >
                                            <TableCell align="center" style={{maxWidth: '300px', wordWrap: "break-word" }}>
                                                {val.txHash}
                                            </TableCell>
                                            <TableCell align="center" style={{maxWidth: '150px', wordWrap: "break-word" }}>{val.functionName}</TableCell>
                                            <TableCell align="center">{`${val.amountIn} ${val.fromTokenSymbol} => ${val.amountOut} ${val.toTokenSymbol}`}</TableCell>
                                            <TableCell align="center">{val.startTime}</TableCell>
                                        </TableRow> 
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <TableContainer component={Paper} sx={{ minHeight: 300, maxHeight: 400 }}>
                        <Table stickyHeader size="small" sx={{ width: "100%" }} aria-label="transactions table">
                            <TableHead>
                                <TableRow>
                                    <TableCell align="center">Tx Hash</TableCell>
                                    <TableCell align="center">Type</TableCell>
                                    <TableCell align="center">Amount In/Out</TableCell>
                                    <TableCell align="center">Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {transactionList && transactionList.length > 0 && (
                                    transactionList.map((val, index) => (
                                        <TableRow
                                            key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                        >
                                            <TableCell align="center" style={{maxWidth: '300px', wordWrap: "break-word" }}>
                                                {val.txHash}
                                            </TableCell>
                                            <TableCell align="center">{val.type}</TableCell>
                                            <TableCell align="center">{`${val.amountIn} ${val.fromSymbol} => ${val.amountOut} ${val.toSymbol}`}</TableCell>
                                            <TableCell align="center">{val.status}</TableCell>
                                        </TableRow> 
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Paper sx={{ minHeight: 40, p: 2 }} align="left">
                        {monitorMessages.map((msg, index) => (
                            <Typography variant='body2' key={index}>
                                {msg}
                            </Typography>
                        ))}
                        
                    </Paper>
                </Stack>
            </SimpleBarReact>
        </Box>
    );
}