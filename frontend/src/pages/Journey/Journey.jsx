import { useJourney } from '../../state/JourneyContext'
import Sources from './Sources'
import StepInput from './StepInput'
import StepOutput from './StepOutput'
import StepProcess from './StepProcess'
import StepRoute from './StepRoute'
import StepValidate from './StepValidate'

const WIZ = ['Retrieved charts', 'Validate', 'Process', 'Review & route', 'Output & download']

export default function Journey() {
  const { step, setStep, maxStep, record, phase, showSources } = useJourney()
  if (phase === 'sources') {
    return (
      <>
        <div className="eyebrow">Before the journey · sources of input data</div>
        <h2>Connect the systems that send charts to CODEX</h2>
        <p className="lead">CODEX is an independent coder. One option is active at a time. Clicking another option activates that one and inactivates the rest. Only the active option’s chart is taken forward.</p>
        <Sources />
      </>
    )
  }
  const s = record ? Math.min(step, maxStep) : 1
  const Body = [StepInput, StepValidate, StepProcess, StepRoute, StepOutput][s - 1]
  return (
    <>
      <div className="eyebrow">Journey · charts from connected sources</div>
      <h2>Charts retrieved from the sources you connected</h2>
      <p className="lead">Each stage takes the previous stage’s output as its input and keeps working on that same patient. The patient name is checked at every stage.</p>
      <div className="ctrls" style={{ marginTop: -6, marginBottom: 12 }}>
        <button className="btn small" onClick={showSources}>‹ Sources of input data</button>
      </div>
      <div className="wiz" id="wiz">
        {WIZ.map((w, i) => (
          <button key={w} className={`${i + 1 === s ? 'on' : ''} ${i + 1 < s ? 'done' : ''}`} disabled={i + 1 > maxStep} onClick={() => setStep(i + 1)}>
            <span className="n">{i + 1 < s ? '✓' : i + 1}</span>{w}
          </button>
        ))}
      </div>
      <div id="jbody">{(s === 1 || record) && <Body key={`${s}-${record?.id || 'none'}`} />}</div>
    </>
  )
}
