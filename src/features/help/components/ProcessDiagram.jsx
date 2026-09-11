import { CheckCircle2, ChevronRight } from "lucide-react";

function ProcessDiagram({ steps = [] }) {
  return <div className="qp-help-process" aria-label="Jarayon ketma-ketligi">
    {steps.map((step, index) => <div className="qp-help-process-step" key={`${step}-${index}`}><span><CheckCircle2 size={16}/></span><strong>{step}</strong>{index < steps.length - 1 ? <ChevronRight size={15}/> : null}</div>)}
  </div>;
}
export default ProcessDiagram;
