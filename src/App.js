import { useEffect, useState } from 'react';
import { red } from '@mui/material/colors';
import { ThemeProvider, createTheme } from '@mui/material/styles'
import Box from '@mui/material/Box';
import { SnackbarProvider } from 'notistack';
import Content from './components/Content';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

const theme = createTheme({
  palette: {
    red: {
      main: red[500],
    },
    mode: 'dark'
  }
});

function App() {

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <SnackbarProvider anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}>
        <div className="App">
          {isLoading ? (
            <Box className="App-Header">
              {/* <img src={logo} className="App-logo" alt="logo" /> */}
              <h1>MEV Uniswap Bot</h1>
            </Box>
          ) : (
            <Box sx={{ flexGrow: 1 }} className="App-Content">
              <Content />
            </Box>
          )}
        </div>
      </SnackbarProvider>
    </ThemeProvider>
    
  );
}

export default App;
