// This reel's edit: scenes (which layout, from which spoken word), accent words, sound effects and music.
// Times come from the cut (work/cut.json, made by `npm run cut`), so a new cut re-times everything by itself.
// Layouts, anchors and options: src/shared/types.ts. Look: docs/style.md.
import { Appear, LogoCard } from "@shared/ui";
import type { ReelEdit } from "@shared/types";
import cut from "./work/cut.json";
import person from "./work/person.json";

const Title = () => (
  <Appear>
    <LogoCard name="My Channel" />
  </Appear>
);

const edit: ReelEdit = {
  cut,
  person,
  scenes: [
    { at: 0, layout: "split", graphic: Title },
  ],
  emphasis: [],
  sfx: [],
};

export default edit;
