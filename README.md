# OHIF DICOM Annotator

An [OHIF Viewer](https://ohif.org/) extension + mode that lets a reader draw segmentations and, for
each segment, answer a list of pre-defined, coded questions. When the reader is done, the tool
writes **two DICOM objects**:

- a **DICOM SEG** (`Segmentation`) containing the labelmap;
- a **DICOM SR** (`Structured Report`) containing the answers, each one linked back to the segment
  it describes.

The questions, their allowed answers, their codes (SCT / RadLex / a local scheme) and their
conditional display rules are entirely **data-driven**: they live in the OHIF app config
(`window.config.characteristicOptionsList`), so a new annotation protocol can be deployed by editing
a config file — no rebuild of the extension needed.

It was built for the PARADIM lung-screening project (CT nodule/cyst characterization), but nothing in
the code is lung-specific except the shipped example configuration.

---

## Contents

| Package | Type | Path | Description |
| --- | --- | --- | --- |
| `segmentation-workflow` | OHIF extension | `extensions/segmentation-workflow` | The annotation panel, the questionnaire dialog, the characteristic store and the DICOM SEG/SR writers. |
| `seg-workflow` | OHIF mode | `modes/seg-workflow` | A CT-only viewer mode that wires the panel, the toolbars and the segmentation tool groups together. |

Developed and tested against **OHIF 3.11.1** (peer dependencies `^3.10.2`).

---

## Features

### Segmentation panel (right panel)

The mode replaces OHIF's stock segmentation panel with a custom one made of three stacked parts:

1. **`PatientPanel`** — shows `PatientName` and `PatientID` with a *Copy* button for each, so the
   reader can paste the identifier into an external worklist / spreadsheet.
2. **`Toolbox`** — the standard OHIF segmentation toolbox (brush, eraser, threshold, shapes,
   marker labelmap, region-segment-plus, slice propagation, interpolation, bidirectional).
3. **`PanelSegmentation`** — a fork of OHIF's `PanelSegmentation` / `SegmentationTable` that adds the
   questionnaire hooks and the "complete" actions.

New segmentations and new segments are created with the placeholder label `TODO`, which makes
un-annotated segments obvious in the list.

### Per-segment questionnaire

Clicking **Edit** on a segment row opens the *Edit Segmentation Characteristics* dialog, a floating
`uiDialogService` dialog built from `characteristicOptionsList`:

- one `<Select>` per question, labelled with the question's `ConceptNameCodeSequence.meaning`;
- a free-text **Comment** field, always present and always optional;
- **conditional questions** — a question declaring `dependsOn` is only rendered when one of the
  declared (question, answer) pairs is currently selected. When a question becomes hidden its answer
  is discarded; when it becomes visible it is pre-filled with its first choice;
- answers are pre-populated from the store when re-opening a segment, so editing is non-destructive.

Two side effects on save, driven by the question flagged `isSegmentationLabel`:

- the segment's **label** is set to the chosen answer's `meaning` (e.g. `solid pulmonary nodule`);
- the segment's **color** is set to the chosen answer's `rbgValues` (at 70 % opacity) if provided,
  so each finding type is rendered with a consistent color across readers and cases.

Answers are held in a [zustand](https://github.com/pmndrs/zustand) store
(`characteristicStore.ts`), keyed by `segmentationId` → `segmentId`. The store is cleared on mode
enter, and a segment's answers are dropped when the segment is deleted.

### Completing an annotation

The segmentation dropdown menu gains two entries:

| Menu entry | Effect |
| --- | --- |
| **Complete Segmentation** | Builds the SEG + SR and `POST`s both to the active OHIF data source (`activeDataSource.store.dicom`, i.e. STOW-RS). |
| **Complete and Download** | Builds the same two objects and downloads them locally as `seg_<YYYY-MM-DD>.dcm` / `sr_<YYYY-MM-DD>.dcm`. |

The stock OHIF *Download & Export* sub-menu (CSV report, DICOM SEG, DICOM RTSS, store SEG) is kept
as-is.

---

## The DICOM output

### DICOM SEG — `services/dicom/seg.ts`

Built with `@cornerstonejs/adapters`' `generateSegmentation` from the Cornerstone labelmap:

- `SeriesDescription` = `Segmentation`;
- `ContentCreatorName` = the logged-in user, in DICOM PN form;
- per-segment metadata: `SegmentLabel` from the panel, `SegmentAlgorithmType` `MANUAL`,
  `SegmentAlgorithmName` `OHIF Brush`, and `RecommendedDisplayCIELabValue` converted from the
  segment's on-screen RGB color;
- `SegmentedPropertyCategoryCodeSequence` / `SegmentedPropertyTypeCodeSequence` are both set to
  `SRT / T-D0050 / Tissue` — the clinically meaningful classification lives in the SR, not here.

### DICOM SR — `services/dicom/sr.ts`

A TID 1500-shaped *Imaging Measurement Report* built with `dcmjs.derivations.StructuredReport`,
whose evidence sequence references the SEG produced in the same operation:

```
Imaging Measurement Report            (DCM 126000, CONTAINER)
└── Measurement Group                 (DCM 125007, CONTAINER)   ← one per segment
    ├── Referenced Segment            (DCM 121191, IMAGE)       ← SEG SOP Instance + ReferencedSegmentNumber
    ├── Finding                       (SCT 121071, CODE, HAS_PROPERTIES)
    │                                                           ← the `isSegmentationLabel` answer
    ├── <question>                    (CODE, CONTAINS)          ← one per answered question
    ├── ...
    └── Comment                       (DCM 121106, TEXT, CONTAINS)  ← only if the reader typed one
```

Other details:

- `SeriesDescription` = `Characteristics`;
- `AuthorObserverSequence` — `ObserverType` `PERSON`, `PersonName` = the logged-in user,
  `InstitutionName` = `window.config.institutionName`;
- `SpecificCharacterSet` defaults to `ISO_IR 192` (UTF-8) when unset;
- coded answers become `CodeContentItem`s; the free-text comment becomes a `TextContentItem`;
- `ReferencedSegmentNumber` is written explicitly, because `dcmjs`'s `ImageContentItem` does not
  emit it.

### Two correctness details worth knowing

- **Segment renumbering.** `dcmjs` ignores the incoming segment indices when writing a SEG and
  simply enumerates the segments it is given. Before building the SR, the stored characteristics are
  therefore re-indexed to `1..N` in list order, so `ReferencedSegmentNumber` in the SR always matches
  the `SegmentNumber` actually written in the SEG. See
  [dcmjs-org/dcmjs#339](https://github.com/dcmjs-org/dcmjs/issues/339).
- **Empty `StudyID`.** OHIF substitutes the string `No Study ID` for an empty `StudyID`; both derived
  datasets restore the original empty value before being stored.

### Author name

`retrieveUserName()` reads the OIDC user from `sessionStorage` under the key
`oidc.user:<authority>:<client_id>` (built from `window.config.oidc[0]`), takes `profile.name`,
strips diacritics, and `toDICOMPN()` converts it to `FAMILY^GIVEN^MIDDLE`. If no OIDC session is
present, the author falls back to `UNKNOWN^AUTHOR`. In other words: **without OIDC configured, the
annotations are stored anonymously** — they are still valid DICOM.

---

## Configuration

Everything the reader is asked lives in the OHIF app config (e.g. `public/config/default.js` or your
deployed `app-config.js`). A working example is provided in
[`app-config.js`](app-config.js).

```js
window.config = {
  // ...
  institutionName: 'CRIUCPQ',            // → SR AuthorObserverSequence.InstitutionName
  characteristicOptionsList: [ /* see below */ ],
};
```

### `characteristicOptionsList`

An ordered array of questions. Each entry:

| Field | Required | Description |
| --- | --- | --- |
| `ConceptNameCodeSequence` | yes | The question, as a coded concept: `{ value, schemeDesignator, meaning }`. `meaning` is what the reader sees. |
| `choices` | yes (non-empty) | The allowed answers, each `{ value, schemeDesignator, meaning, rbgValues? }`. |
| `isSegmentationLabel` | one question only | Marks the question whose answer becomes the segment label (and color). Emitted as the SR *Finding*. |
| `dependsOn` | no | Array of `[questionKey, answerKey]` pairs. The question is shown when **any** pair matches the current selection. |

Keys used by `dependsOn` are `"<schemeDesignator>-<value>"` — of the *question* for the first
element, of the *answer* for the second.

`rbgValues` is `[r, g, b]` in 0–255 and is only meaningful on the `isSegmentationLabel` question.

```js
characteristicOptionsList: [
  {
    isSegmentationLabel: true,
    ConceptNameCodeSequence: { value: '121071', schemeDesignator: 'SCT', meaning: 'Finding' },
    choices: [
      { value: 'RID50151', schemeDesignator: 'RadLex', meaning: 'solid pulmonary nodule',     rbgValues: [120, 240, 130] },
      { value: 'RID50153', schemeDesignator: 'RadLex', meaning: 'non-solid pulmonary nodule', rbgValues: [120, 230, 230] },
      { value: '107', schemeDesignator: 'ParadimLungScreening2025', meaning: 'atypical cyst', rbgValues: [230, 75, 50] },
    ],
  },
  {
    // Only asked when the Finding is a solid or non-solid pulmonary nodule.
    dependsOn: [
      ['SCT-121071', 'RadLex-RID50151'],
      ['SCT-121071', 'RadLex-RID50153'],
    ],
    ConceptNameCodeSequence: {
      value: 'RID50152', schemeDesignator: 'RadLex', meaning: 'part-solid pulmonary nodule',
    },
    choices: [
      { value: 'RID28475', schemeDesignator: 'RadLex', meaning: 'no' },
      { value: 'RID28474', schemeDesignator: 'RadLex', meaning: 'yes' },
      { value: '99', schemeDesignator: 'ParadimLungScreening2025', meaning: 'N/A' },
    ],
  },
]
```

### Validation

The list is validated every time the dialog is opened; an invalid configuration throws:

- every question must declare at least one choice;
- at least one question must set `isSegmentationLabel: true`.

Because the first choice of a visible question is auto-selected, **put your "not answered" / "N/A"
option first** if you want to be able to tell a deliberate answer from a default one — that is what
the example config does.

---

## Installation

The extension and the mode are consumed as local packages of an OHIF monorepo checkout.

```bash
# from the root of your OHIF Viewers checkout
git clone <this-repo> custom

yarn cli link-extension ./extensions/segmentation-workflow
yarn cli link-mode      ./modes/seg-workflow
```

This adds the two packages to `platform/app/pluginConfig.json`:

```jsonc
{
  "extensions": [
    // ...
    { "packageName": "segmentation-workflow", "version": "0.0.1" }
  ],
  "modes": [
    // ...
    { "packageName": "seg-workflow", "version": "0.0.1" }
  ]
}
```

Then run or build the viewer as usual (`yarn dev`, `yarn build`). In a Docker build, do the linking
after the sources are copied and before `build`:

```dockerfile
RUN bun cli link-extension ./extensions/segmentation-workflow
RUN bun cli link-mode ./modes/seg-workflow
RUN bun run build
```

Finally, make sure the config you serve defines `characteristicOptionsList` (and, optionally,
`institutionName` and `oidc`).

---

## The `seg-workflow` mode

- **Route:** `/seg-workflow`, display name *Segmentation-workflow*.
- **Applicability:** studies containing a `CT` series only (`isValidMode`).
- **Layout:** OHIF's default viewer layout — series list on the left, the annotation panel on the
  right, Cornerstone stack viewport + DICOM SEG viewport in the middle, `@ohif/mnGrid` hanging
  protocol.
- **Extension dependencies:** `@ohif/extension-default`, `@ohif/extension-cornerstone`,
  `@ohif/extension-cornerstone-dicom-seg` (all `^3.0.0`).
- **On enter:** clears the characteristic store, initializes the tool groups, and builds the primary
  / more-tools / segmentation toolbar sections.
- **On exit:** hides dialogs and modals and destroys the tool group, sync group, segmentation and
  viewport services.

Primary toolbar: window level, pan, zoom, tag browser, capture, layout, more tools (reset, rotate,
flip, reference lines, image overlay, crosshairs, stack scroll, invert, cine, magnify, trackball
rotate).

---

## Repository layout

```
extensions/segmentation-workflow/
└── src/
    ├── index.tsx                       # extension definition; registers the panel module
    ├── components/
    │   ├── PatientPanel.tsx            # patient name / ID with copy buttons
    │   ├── PanelSegmentation.tsx       # segmentation panel + command handlers
    │   ├── CharacteristicsDialog.tsx   # the questionnaire (incl. dependsOn logic)
    │   ├── LoadingIndicator.tsx
    │   ├── DataRow/                    # forked segment row
    │   └── SegmentationTable/
    │       ├── SegmentationTable.tsx
    │       ├── SegmentationSegments.tsx
    │       ├── CustomDropdownMenuContent.tsx  # "Complete Segmentation" actions
    │       └── characteristicStore.ts  # zustand store of answers
    ├── services/
    │   ├── segment.ts                  # opens the dialog, applies label + color
    │   ├── onSegmentationComplete.ts   # orchestrates SEG + SR creation and storage
    │   └── dicom/
    │       ├── seg.ts                  # DICOM SEG generation
    │       ├── sr.ts                   # DICOM SR generation (TID 1500 shape)
    │       └── utils.ts                # OIDC user name → DICOM PN
    └── utils/                          # dialog helpers
modes/seg-workflow/
└── src/
    ├── index.tsx                       # mode factory, routes, toolbar sections
    ├── initToolGroups.ts
    └── toolbarButtons.ts
```

---

## Known limitations

- The mode imports the characteristic store from the extension through a **relative path**
  (`../../extensions/segmentation-workflow/src/...`), so the two packages must stay siblings in
  the same checkout; they are not independently publishable as-is.
- Answers live in memory only. They are not persisted across a page reload, and re-opening an
  already-stored SEG does **not** reload its SR answers into the panel — completing again produces
  new SEG/SR instances rather than updating the previous ones.
- `isValidMode` restricts the mode to CT.
- The example coding scheme `ParadimLungScreening2025` is a **local, non-registered** designator used
  for concepts with no SCT/RadLex equivalent. Replace it with your own scheme (and register it) if
  the data leaves your institution.
- Nothing enforces that every segment has been characterized before *Complete Segmentation*; a
  segment left at label `TODO` will be written to the SEG with no matching measurement group in the
  SR.

---

## License

MIT — see the `LICENSE` file in each package.

Author: Gabriel Couture.
