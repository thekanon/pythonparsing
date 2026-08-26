export default function Loading() {
  return (
    <div
      className="page-shell"
      aria-busy="true"
      aria-label="페이지를 불러오는 중"
    >
      <div className="skeleton h-5 w-32" />
      <div className="skeleton mt-5 h-14 w-full max-w-2xl" />
      <div className="skeleton mt-4 h-6 w-full max-w-xl" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="skeleton h-48" />
        <div className="skeleton h-48" />
      </div>
      <span className="sr-only">페이지를 불러오고 있습니다.</span>
    </div>
  );
}
