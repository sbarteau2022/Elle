// ============================================================
// Registers Elle's built-in panels with the plugin registry. Importing this
// module for its side effect is what used to be ten hardcoded imports and a
// switch statement in App.tsx — the render props per panel are unchanged
// from what App.tsx passed before (some take `worker`, some don't; that
// split is preserved exactly).
// ============================================================
import EllePanel from '../components/EllePanel'
import ConductorPanel from '../components/ConductorPanel'
import LibraryPanel from '../components/LibraryPanel'
import ResearchPanel from '../components/ResearchPanel'
import IdentityPanel from '../components/IdentityPanel'
import MirrorPanel from '../components/MirrorPanel'
import OptimusPanel from '../components/OptimusPanel'
import TradingPanel from '../components/TradingPanel'
import CodePanel from '../components/CodePanel'
import Evals from '../components/Evals'
import DiagnosePanel from '../components/DiagnosePanel'
import HealthPanel from '../components/HealthPanel'
import SandboxPanel, { sandboxHasUnseenReport } from '../components/SandboxPanel'
import IdeasPanel from '../components/IdeasPanel'
import ForgePanel from '../components/ForgePanel'
import DuplexPanel, { duplexHasUnseen } from '../components/DuplexPanel'
import FalconPanel from '../components/FalconPanel'
import AtlasPanel from '../components/AtlasPanel'
import { registerPanel } from './registry'

registerPanel({
  id: 'elle', glyph: '◈', label: 'elle', section: 'mind', order: 1,
  render: ({ worker, accent }) => <EllePanel worker={worker} accent={accent} />,
})
registerPanel({
  id: 'conductor', glyph: '∞', label: 'conductor', section: 'mind', order: 2,
  render: ({ accent }) => <ConductorPanel accent={accent} />,
})
registerPanel({
  id: 'library', glyph: '▣', label: 'library', section: 'mind', order: 3,
  render: ({ accent }) => <LibraryPanel accent={accent} />,
})
registerPanel({
  id: 'research', glyph: '▨', label: 'research', section: 'mind', order: 3.5,
  render: ({ accent }) => <ResearchPanel accent={accent} />,
})
registerPanel({
  id: 'identity', glyph: '✶', label: 'identity', section: 'mind', order: 4,
  render: ({ accent }) => <IdentityPanel accent={accent} />,
})
registerPanel({
  id: 'mirror', glyph: '◐', label: 'mirror', section: 'mind', order: 11,
  render: ({ worker, accent }) => <MirrorPanel worker={worker} accent={accent} />,
})
registerPanel({
  id: 'atlas', glyph: '⌬', label: 'atlas', section: 'mind', order: 11.5,
  render: ({ worker, accent }) => <AtlasPanel worker={worker} accent={accent} />,
})
registerPanel({
  id: 'optimus', glyph: 'φ', label: 'optimus', section: 'work', order: 5,
  render: ({ worker, accent }) => <OptimusPanel worker={worker} accent={accent} />,
})
registerPanel({
  id: 'trading', glyph: '$', label: 'trading', section: 'work', order: 6,
  render: ({ accent }) => <TradingPanel accent={accent} />,
})
registerPanel({
  id: 'code', glyph: '{}', label: 'code', section: 'work', order: 7,
  render: ({ worker, accent }) => <CodePanel worker={worker} accent={accent} />,
})
registerPanel({
  id: 'evals', glyph: '▤', label: 'evals', section: 'work', order: 8,
  render: ({ worker, accent }) => <Evals worker={worker} accent={accent} />,
})
registerPanel({
  id: 'sandbox', glyph: '⇅', label: 'sandbox', section: 'work', order: 8.5,
  render: ({ accent }) => <SandboxPanel accent={accent} />,
  alert: sandboxHasUnseenReport,
})
registerPanel({
  id: 'ideas', glyph: '✦', label: 'ideas', section: 'work', order: 8.7,
  render: ({ accent }) => <IdeasPanel accent={accent} />,
})
registerPanel({
  id: 'forge', glyph: '⚒', label: 'forge', section: 'work', order: 8.8,
  render: ({ accent }) => <ForgePanel accent={accent} />,
})
registerPanel({
  id: 'duplex', glyph: '⇄', label: 'duplex', section: 'mind', order: 2.5,
  render: ({ accent }) => <DuplexPanel accent={accent} />,
  alert: duplexHasUnseen,
})
registerPanel({
  id: 'falcon', glyph: '⌖', label: 'falcon', section: 'work', order: 8.9,
  render: ({ accent }) => <FalconPanel accent={accent} />,
})
registerPanel({
  id: 'diagnose', glyph: '✚', label: 'diagnose', section: 'ops', order: 9,
  render: ({ accent }) => <DiagnosePanel accent={accent} />,
})
registerPanel({
  id: 'health', glyph: '●', label: 'health', section: 'ops', order: 10,
  render: ({ accent }) => <HealthPanel accent={accent} />,
})
