# Commotion demo runbook

## Before presenting

1. Open a fresh Commotion session and keep the **Sources & assumptions** panel available.
2. Start with the Yorkdale scenario, then reset or start a fresh session before the Mars scenario.
3. Let each 30-second event segment finish processing, read its impact headline, then play the recorded scene for the audience.

Every submitted event goes through the AI interpreter, including events in the Yorkdale and Mars environments. Jev receives the original wording and interpreted conditions for each person's decision. The engine does not assign promotion or evacuation goals to preset groups. Reactions vary; describe what the recording shows.

## Demo 1: Yorkdale shopping mall

### Start the environment

Enter any scenario description containing **Yorkdale**. The app selects the curated Yorkdale mall world with a fixed population of 100 people.

The scene uses an original, general mall layout rather than a map of Yorkdale. Its stores include real Yorkdale merchants, with live source links shown in the app:

- [Levi's at Yorkdale](https://yorkdale.com/store/levis)
- [Zara at Yorkdale](https://yorkdale.com/store/zara)
- [Yogen Früz at Yorkdale](https://yorkdale.com/store/yogen-fruz) — the ice-cream/frozen-treat destination

### Walkthrough

Submit these events in order:

1. **“50% off ice cream at Yogen Früz in the food court.”**
   Inspect the interpreted discount, then observe whether shoppers change destinations or make purchases.
2. **“Levi's is selling jeans for 20% off.”**
   Observe individual decisions and any recorded change in traffic toward Levi's.
3. **“Zara is selling underwear for 30% off.”**
   Show the final headline, crowd response, and the timeline chapters created by the three events.

For a contrasting situation, reset and submit **“Someone threw up inside Yogen Früz.”** Check that the interpretation describes the incident, then observe whether people choose to leave or avoid that store. They remain within the mall; headcount stays at 100. Store names and products do not trigger preset offers.

### Message to land

Commotion turns an operational change into individual, explainable decisions. Jev makes the individual choices; the recorded scene makes the aggregate crowd response visible.

## Demo 2: Mars base

### Start the environment

Enter any scenario description containing **Mars base**. The app should select the enhanced Mars-base world.

There are 30 astronauts in spacesuits. The environment has a dark, star-filled sky and a visual low-gravity movement effect.

### Walkthrough

Submit:

> **“Aliens land on Mars.”**

After processing completes, inspect how the event was interpreted and play the segment. The interpretation determines the visual and effects. Astronauts choose how to respond; mentioning aliens does not automatically trigger a threat or evacuation.

### Message to land

The same simulation system can handle an unexpected event while retaining individual behavior and a readable collective outcome.

## Build acceptance checks

- Any prompt containing **yorkdale** activates the Yorkdale enhanced world; any prompt containing **mars base** activates the Mars enhanced world, case-insensitively.
- Other environment prompts use normal research-backed generation. All event prompts use the interpreter in every world.
- Yorkdale exposes the curated merchant sources above in the UI and identifies the scene as an illustrative layout.
- Incident, closure, negation and promotion prompts preserve their different meanings and stated amounts through the interpreter.
- No preset group receives shopping or evacuation goals. Each person's reaction follows their own Jev decision.
- Impact headlines describe the interpreted event; metrics and consequences report observed recording values without claiming predetermined crowd movements.
