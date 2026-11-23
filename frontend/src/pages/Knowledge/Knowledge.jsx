import { useEffect, useState } from 'react'
import Agents from '../Agents'
import Customers from '../Customers'
import { go } from '../../lib/useHash'
import { TOPICS } from './topics'

const PAGES = [
  { id: 'agents', title: 'Agents & architecture', kicker: 'How the engine is built', lead: 'The five agents, what each one receives and returns, and the tools behind them.' },
  { id: 'customers', title: 'Customers & GTM', kicker: 'Who buys CODEX', lead: 'The buyer segments, how each one is sold, and the proposed way to charge.' },
  { id: 'cheatsheet', title: 'Cheat sheet', kicker: 'Sales brief', lead: 'The one-page brief: the pitch, the stages, the buyers, and the compliance lines.' },
]

const known = new Set([...TOPICS.map((t) => t.id), ...PAGES.map((p) => p.id)])
const topicId = () => {
  const id = location.hash.slice(1).split('?')[0].split('/')[1] || ''
  return known.has(id) ? id : ''
}

function ItemButton({ item, on, onPick }) {
  return (
    <button className={on ? 'on' : ''} onClick={() => onPick(item.id)}>
      <b>{item.title}</b>
      <span>{item.kicker}</span>
    </button>
  )
}

function Sidebar({ current }) {
  const pick = (id) => go('knowledge/' + id)
  return (
    <div className="card klist">
      <div className="eyebrow">Knowledge bank</div>
      <h3>Contents</h3>
      <button onClick={() => go('knowledge')}><b>All topics</b><span>Back to the guide</span></button>
      <h4>Guide</h4>
      {TOPICS.map((t) => <ItemButton key={t.id} item={t} on={t.id === current} onPick={pick} />)}
      <h4>Product</h4>
      {PAGES.map((p) => <ItemButton key={p.id} item={p} on={p.id === current} onPick={pick} />)}
    </div>
  )
}

function Index() {
  return (
    <>
      <div className="eyebrow">Knowledge bank</div>
      <h2>Plain-language guide</h2>
      <p className="lead">Short explanations of the words a buyer, a coder, and a new teammate meet in CODEX. The product pages below are the agents, the customer story, and the sales cheat sheet. The figures in “Who pays whom” are illustrations, not Medicare rates.</p>
      <h3>Guide</h3>
      <div className="kcards">
        {TOPICS.map((t) => (
          <button key={t.id} onClick={() => go('knowledge/' + t.id)}>
            <div className="eyebrow">{t.kicker}</div>
            <h3>{t.title}</h3>
            <p className="small" style={{ margin: 0 }}>{t.lead}</p>
          </button>
        ))}
      </div>
      <h3 style={{ marginTop: 22 }}>Product</h3>
      <div className="kcards">
        {PAGES.map((p) => (
          <button key={p.id} onClick={() => go('knowledge/' + p.id)}>
            <div className="eyebrow">{p.kicker}</div>
            <h3>{p.title}</h3>
            <p className="small" style={{ margin: 0 }}>{p.lead}</p>
          </button>
        ))}
      </div>
    </>
  )
}

function Guide({ topic }) {
  return (
    <>
      <div className="eyebrow">{topic.kicker}</div>
      <h2>{topic.title}</h2>
      <p className="lead">{topic.lead}</p>
      {topic.flow && (
        <div className="grid g3" style={{ marginBottom: 16 }}>
          {topic.flow.map(([n, who, what]) => (
            <div className="card" key={n}>
              <div className="eyebrow">Step {n}</div>
              <h3>{who}</h3>
              <p className="small" style={{ margin: 0 }}>{what}</p>
            </div>
          ))}
        </div>
      )}
      {topic.blocks.map((b) => (
        <div className="card" key={b.h} style={{ marginBottom: 16 }}>
          <h3>{b.h}</h3>
          {b.p && <p className="small" style={{ margin: 0 }}>{b.p}</p>}
          {b.terms && (
            <dl className="gdef">
              {b.terms.map((t) => (
                <div key={t.term}><dt>{t.term}</dt><dd>{t.means}</dd></div>
              ))}
            </dl>
          )}
          {b.items && <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{b.items.map((item) => <li key={item}>{item}</li>)}</ul>}
        </div>
      ))}
    </>
  )
}

function CheatSheet() {
  return (
    <>
      <div className="eyebrow">Sales brief</div>
      <h2>Cheat sheet</h2>
      <p className="lead">The same brief that used to open on its own. It stays printable from the link.</p>
      <p className="small"><a href="/CODEX_Cheat_Sheet.html" target="_blank" rel="noopener">Open the printable cheat sheet ↗</a></p>
      <iframe className="ksheet" title="CODEX cheat sheet" src="/CODEX_Cheat_Sheet.html" />
    </>
  )
}

function Body({ id }) {
  const topic = TOPICS.find((t) => t.id === id)
  if (topic) return <Guide topic={topic} />
  if (id === 'agents') return <Agents />
  if (id === 'customers') return <Customers />
  if (id === 'cheatsheet') return <CheatSheet />
  return null
}

export default function Knowledge() {
  const [id, setId] = useState(topicId)
  useEffect(() => {
    const sync = () => setId(topicId())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  useEffect(() => { window.scrollTo({ top: 0 }) }, [id])
  return (
    <div id="knowledge">
      {id
        ? <div className="kgrid"><Sidebar current={id} /><div><Body id={id} /></div></div>
        : <Index />}
    </div>
  )
}
