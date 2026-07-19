import { ReactNode } from "react";

// The bottom button-row layout, extracted verbatim.
const StepFooter = ({ children }: { children: ReactNode }) => {
  return <div className="flex justify-between pt-6">{children}</div>;
};

export default StepFooter;
