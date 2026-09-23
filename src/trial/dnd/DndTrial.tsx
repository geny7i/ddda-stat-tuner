import { useState } from "react";
import { LEVEL_RANGES, VOCATION_IDS } from "../../domain";
import { PathEditor } from "../../features/pathEditor/PathEditor";
import {
  addSelection,
  initialTrialState,
  removeOne,
  replaceOne,
} from "./model";

const trialVocations = [
  VOCATION_IDS.fighter,
  VOCATION_IDS.mage,
  VOCATION_IDS.assassin,
];

export function DndTrial() {
  const [state, setState] = useState(initialTrialState);

  return (
    <>
      <h1>ドラッグ操作の試運転</h1>
      <PathEditor
        path={state.path}
        visibleRanges={LEVEL_RANGES.map(({ id }) => id)}
        vocations={trialVocations}
        onAdd={(range, vocation, count) =>
          setState((current) => addSelection(current, range, vocation, count))
        }
        onReplace={(range, source, target) =>
          setState((current) => replaceOne(current, range, source, target))
        }
        onRemove={(range, vocation) =>
          setState((current) => removeOne(current, range, vocation))
        }
      />
      <p role="status">{state.message}</p>
      <output data-testid="update-count">更新回数: {state.updates}</output>
    </>
  );
}
