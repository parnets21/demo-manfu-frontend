import { Stepper as StepperUI } from '../ui';
export default function Stepper({ steps, current }) {
  return <StepperUI steps={steps} current={current} />;
}
