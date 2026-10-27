// Shared page header with title, breadcrumb, and optional action buttons
export default function PageHeader({ title, breadcrumb, children }) {
  return (
    <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
      <div>
        <div className="text-[21px] font-extrabold text-[#1c2833] tracking-[-0.3px]">{title}</div>
        <div className="flex items-center gap-[5px] text-[12px] text-[#a0aec0] mt-[3px]">
          <span>Home</span><span>›</span>
          <span className="text-[#1e40af] font-semibold">{breadcrumb}</span>
        </div>
      </div>
      {children && <div className="flex gap-[10px]">{children}</div>}
    </div>
  );
}
