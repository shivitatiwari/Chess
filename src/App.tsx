import { Navigate, Route, Routes } from 'react-router-dom'
import { Header } from './components/Header'
import AuthPage from './pages/AuthPage'
import BotGame from './pages/BotGame'
import Home from './pages/Home'
import LiveGame from './pages/LiveGame'
import MultiplayerLobby from './pages/MultiplayerLobby'
import Spectate from './pages/Spectate'

export default function App() {
  return <div className="app"><Header/><Routes>
    <Route path="/" element={<Home/>}/>
    <Route path="/auth" element={<AuthPage/>}/>
    <Route path="/bot" element={<BotGame/>}/>
    <Route path="/multiplayer" element={<MultiplayerLobby/>}/>
    <Route path="/play/:gameId" element={<LiveGame/>}/>
    <Route path="/spectate/:gameId" element={<Spectate/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></div>
}
