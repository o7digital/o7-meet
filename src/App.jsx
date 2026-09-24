import { Suspense, lazy } from 'react';
import { AppShell } from './components/AppShell';
import { LoadingState } from './components/Feedback';
import { useNavigation } from './hooks/useNavigation';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CreateMeetingPage = lazy(() => import('./pages/CreateMeetingPage'));
const JoinMeetingPage = lazy(() => import('./pages/JoinMeetingPage'));
const MeetingRoomPage = lazy(() => import('./pages/MeetingRoomPage'));
const MeetingSummaryPage = lazy(() => import('./pages/MeetingSummaryPage'));
const MeetingsPage = lazy(() => import('./pages/MeetingsPage'));

const routes = {
  home: DashboardPage,
  create: CreateMeetingPage,
  join: JoinMeetingPage,
  meeting: MeetingRoomPage,
  summary: MeetingSummaryPage,
  meetings: MeetingsPage,
};

export function App() {
  const navigation = useNavigation();
  const Page = routes[navigation.route.name] || DashboardPage;

  return (
    <AppShell navigation={navigation} meetingMode={navigation.route.name === 'meeting'}>
      <Suspense fallback={<LoadingState label="Cargando O7 Meet…" />}>
        <Page navigation={navigation} params={navigation.route.params} />
      </Suspense>
    </AppShell>
  );
}
