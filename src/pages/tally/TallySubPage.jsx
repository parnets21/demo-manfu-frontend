import TallyPage from './TallyPage';

// Maps URL path segment → TallyPage tab index
// Tabs: 0=Overview  1=Import from Tally  2=Export to Tally  3=Logs  4=Settings
const TAB_MAP = {
  overview:     0,
  import:       1,
  export:       2,
  logs:         3,
  settings:     4,
  // legacy aliases — keep old URLs working
  dashboard:    0,
  master:       1,
  transactions: 2,
  config:       4,
};

export default function TallySubPage({ tab }) {
  const initialTab = TAB_MAP[tab] ?? 0;
  return <TallyPage initialTab={initialTab} />;
}
