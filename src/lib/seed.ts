import type { Ticket } from "../types";
import { addDaysISO, todayISO } from "./utils";

const SPEED_CAM =
  "https://image.qwenlm.ai/generated-images/781a64af-5dd6-42c5-b859-cf17e88e0c50/_result.png";
const STOP_SIGN =
  "https://image.qwenlm.ai/generated-images/a61ad09d-69ae-4618-889f-53576b7726c2/_result.png";

export function seedTickets(): Ticket[] {
  const today = todayISO();
  const now = Date.now();
  const d = (n: number) => addDaysISO(today, n);

  return [
    {
      id: "seed-speeding",
      citationNo: "SP-48213",
      violation: "Speeding — 47 in a 35",
      location: "Maple Ave & 9th St",
      officer: "Ofc. D. Reyes #2214",
      plate: "7KTR-482",
      court: "District 4 Traffic Court",
      issuedOn: d(-11),
      dueOn: d(3),
      fine: 186,
      status: "open",
      phone: "(555) 014-2231",
      leadDays: 2,
      notes: [
        {
          id: "seed-n1",
          text: "Dashcam still saved — traffic was moving at speed. Could argue for a reduction to a non-moving violation.",
          createdAt: now - 86400000 * 9,
        },
        {
          id: "seed-n2",
          text: "Clerk said online payment waives the court appearance. Decide before Friday.",
          createdAt: now - 86400000 * 2,
        },
      ],
      attachments: [
        {
          id: "seed-a1",
          name: "dashcam-still.png",
          mime: "image/png",
          size: 482133,
          src: SPEED_CAM,
          kind: "image",
          addedAt: now - 86400000 * 9,
        },
      ],
      createdAt: now - 86400000 * 11,
      resolvedAt: null,
    },
    {
      id: "seed-stop",
      citationNo: "FS-11907",
      violation: "Failure to come to complete stop",
      location: "Birchwood Rd at Elm Ct",
      officer: "Ofc. M. Kowalski #0931",
      plate: "7KTR-482",
      court: "Municipal Court — Window 6",
      issuedOn: d(-24),
      dueOn: d(-4),
      fine: 235,
      status: "open",
      phone: "(555) 014-2231",
      leadDays: 3,
      notes: [
        {
          id: "seed-n3",
          text: "Called the clerk — asked for an extension, awaiting callback. Late fee of $25 may already apply.",
          createdAt: now - 86400000 * 3,
        },
      ],
      attachments: [
        {
          id: "seed-a2",
          name: "intersection-photo.png",
          mime: "image/png",
          size: 391204,
          src: STOP_SIGN,
          kind: "image",
          addedAt: now - 86400000 * 20,
        },
      ],
      createdAt: now - 86400000 * 24,
      resolvedAt: null,
    },
    {
      id: "seed-rego",
      citationNo: "RG-77340",
      violation: "Expired registration sticker",
      location: "I-84 East, Exit 12",
      officer: "Trp. A. Singh #1187",
      plate: "7KTR-482",
      court: "",
      issuedOn: d(-6),
      dueOn: d(12),
      fine: 75,
      status: "contesting",
      phone: "",
      leadDays: 3,
      notes: [
        {
          id: "seed-n4",
          text: "Renewal receipt from the DMV is in the glovebox — dismissal is usually granted with proof. Bring printout.",
          createdAt: now - 86400000 * 5,
        },
      ],
      attachments: [],
      createdAt: now - 86400000 * 6,
      resolvedAt: null,
    },
    {
      id: "seed-parking",
      citationNo: "PK-30518",
      violation: "Parking — street sweeping zone",
      location: "400 block, Warren St",
      officer: "P.O. badge 3390",
      plate: "7KTR-482",
      court: "",
      issuedOn: d(-19),
      dueOn: d(-6),
      fine: 45,
      status: "paid",
      phone: "",
      leadDays: 2,
      notes: [
        {
          id: "seed-n5",
          text: "Paid online, confirmation #A-99172. Case closed.",
          createdAt: now - 86400000 * 7,
        },
      ],
      attachments: [],
      createdAt: now - 86400000 * 19,
      resolvedAt: now - 86400000 * 7,
    },
  ];
}
