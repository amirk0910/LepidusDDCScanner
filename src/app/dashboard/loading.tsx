export default function Loading() {
  return <main id="main-content" className="loading-page" aria-busy="true"><h1>Loading your workspace...</h1><p>Retrieving your owner-isolated scan records.</p><div className="lp-skeleton lp-skeleton--rect" role="status" aria-label="Loading scan history" /></main>;
}
