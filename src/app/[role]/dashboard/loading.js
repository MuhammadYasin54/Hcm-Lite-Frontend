export default function DashboardLoading() {
  return (
    <section className="workspace-page" aria-busy="true" aria-label="Loading dashboard">
      <div className="metric-grid">
        {[1, 2, 3, 4].map((item) => <div className="metric-skeleton" key={item}><span /><strong /></div>)}
      </div>
    </section>
  );
}
