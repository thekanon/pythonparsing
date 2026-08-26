import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-shell min-h-[65dvh] content-center">
      <p className="eyebrow">찾을 수 없음</p>
      <h1 className="page-title mt-3">요청한 학습을 찾지 못했습니다.</h1>
      <p className="lede mt-5">
        철회되었거나 아직 공개되지 않은 콘텐츠일 수 있습니다.
      </p>
      <Link href="/today" className="button button-primary mt-8">
        오늘 학습으로
      </Link>
    </div>
  );
}
