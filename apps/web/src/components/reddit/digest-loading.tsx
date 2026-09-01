export function RedditDigestLoading() {
  return (
    <div
      className="mt-12 grid gap-10"
      role="status"
      aria-live="polite"
      aria-label="Reddit 학습을 불러오는 중"
    >
      {[0, 1].map((item) => (
        <section key={item} aria-hidden="true">
          <div className="skeleton h-8 w-44" />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="skeleton h-72 w-full" />
            <div className="skeleton h-72 w-full" />
          </div>
        </section>
      ))}
    </div>
  );
}
