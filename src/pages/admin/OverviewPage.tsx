import UserDashboardPage from "./UserDashboardPage";

// Overview is the rebranded UserDashboardPage — same data, same widgets,
// re-exported so future ownership-aware widgets can be added here without
// touching the original file.
export default function OverviewPage() {
  return <UserDashboardPage />;
}
