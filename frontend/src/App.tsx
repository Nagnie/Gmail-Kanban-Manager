import { BrowserRouter as Router, useRoutes } from 'react-router-dom'
import { routeConfig } from './config/routeConfig.tsx'
import { useAppDispatch } from './hooks/redux.ts'
import { initializeAuth } from './store/authSlice.ts'
import { useEffect } from 'react'

function AppRoutes() {
    const routes = useRoutes(routeConfig)
    return routes
}

function App() {
    const dispatch = useAppDispatch();

    useEffect(() => {
        const init = async () => {
            await dispatch(initializeAuth()); 
        };

        init();
    }, [dispatch]);

    return (
        <Router>
            <AppRoutes />
        </Router>
    )
}

export default App