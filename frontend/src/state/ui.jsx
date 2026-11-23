// Toasts + modal shared across the app.
import { createContext, useCallback, useContext, useState } from 'react'

const UICtx = createContext(null)
export const useUI = () => useContext(UICtx)

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [modal, setModal] = useState(null)
  const toast = useCallback((text) => {
    const id = Math.random()
    setToasts((t) => [...t, { id, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])
  return (
    <UICtx.Provider value={{ toast, openModal: setModal, closeModal: () => setModal(null) }}>
      {children}
      {toasts.map((t, i) => <div key={t.id} className="toast" style={{ bottom: 20 + i * 52 }}>{t.text}</div>)}
      {modal && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setModal(null)}>
          <div>{modal}<div style={{ textAlign: 'right', marginTop: 12 }}><button className="btn" onClick={() => setModal(null)}>Close</button></div></div>
        </div>
      )}
    </UICtx.Provider>
  )
}
