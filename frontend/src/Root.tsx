import { store } from './store'
import { Provider } from 'react-redux'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ThemeProvider } from './components/theme-provider'
import App from './App'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "mock-google-client-id-for-development";

const Root = () => {
  return (
        <Provider store={store}>
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                    <App />
                </ThemeProvider>
            </GoogleOAuthProvider>
        </Provider>
    )
}

export default Root