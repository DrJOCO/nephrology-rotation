import { T, LANDMARK_TRIALS } from "../../data/constants";
import { CategoryGroupedTrials } from "./TrialCard";
import { backBtnStyle } from "./shared";

export default function LandmarkTrialsView({ week, onBack, bookmarks, onToggleBookmark }) {
  const trials = LANDMARK_TRIALS[week] || [];
  return (
    <div style={{ padding: 16 }}>
      <button onClick={onBack} style={backBtnStyle}>{"\u2190"} Back</button>
      <h2 style={{ fontFamily: T.serif, color: T.navy, fontSize: 20, margin: "0 0 4px", fontWeight: 700 }}>Module {week}: Landmark Trials</h2>
      <p style={{ color: T.sub, fontSize: 13, margin: "0 0 16px" }}>Key trials that shaped nephrology practice</p>
      <CategoryGroupedTrials trials={trials} bookmarks={bookmarks} onToggleBookmark={onToggleBookmark} />
      <button onClick={onBack} style={{ ...backBtnStyle, marginTop: 16, marginBottom: 0 }}>{"\u2190"} Back</button>
    </div>
  );
}
