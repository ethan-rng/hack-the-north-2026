# Commotion demo runbook

## Before presenting

1. Open a fresh Commotion session and keep the **Sources & assumptions** panel available.
2. Start with the Yorkdale scenario, then reset or start a fresh session before the Mars scenario.
3. Let each 30-second event segment finish processing, read its impact headline, then play the recorded scene for the audience.

## Demo 1: Yorkdale shopping mall

### Start the environment

Enter any scenario description containing **Yorkdale**. The app should select the enhanced Yorkdale mall world while still showing it as a generated scenario.

The scene uses an original, general mall layout rather than a map of Yorkdale. Its stores include real Yorkdale merchants, with live source links shown in the app:

- [Levi's at Yorkdale](https://yorkdale.com/store/levis)
- [Zara at Yorkdale](https://yorkdale.com/store/zara)
- [Yogen Früz at Yorkdale](https://yorkdale.com/store/yogen-fruz) — the ice-cream/frozen-treat destination

### Walkthrough

Submit these events in order:

1. **“50% off ice cream at Yogen Früz in the food court.”**
   Show the impact headline, then play the crowd moving toward Yogen Früz and the food-court area.
2. **“Levi's is selling jeans for 20% off.”**
   Show the headline and the shift in shoppers’ goals and traffic toward Levi's.
3. **“Zara is selling underwear for 30% off.”**
   Show the final headline, crowd response, and the timeline chapters created by the three events.

### Message to land

Commotion turns an operational change into individual, explainable decisions. Jev makes the individual choices; the recorded scene makes the aggregate crowd response visible.

## Demo 2: Mars base

### Start the environment

Enter any scenario description containing **Mars base**. The app should select the enhanced Mars-base world.

There are 30 astronauts in spacesuits. The environment has a dark, star-filled sky and a visual low-gravity movement effect.

### Walkthrough

Submit:

> **“Aliens land on Mars.”**

After processing completes, show the impact headline and play the segment. A UFO arrives and lands, large threatening aliens emerge, and astronauts react through Jev decisions. People who flee move faster toward the base’s designated safehouse/bunker.

### Message to land

The same simulation system can handle an unexpected event while retaining individual behavior and a readable collective outcome.

## Build acceptance checks

- Any prompt containing **yorkdale** activates the Yorkdale enhanced world; any prompt containing **mars base** activates the Mars enhanced world, case-insensitively.
- Other prompts still use normal research-backed generation and support off-script events in either demo world.
- Yorkdale research runs for real and exposes the merchant sources above in the UI; the demo scene does not pretend to be an exact Yorkdale floor plan.
- The scripted events remain valid executable events, but Jev continues to choose each person’s response.
- The Mars alien arrival has a reliable visual sequence: UFO entrance, landing, large aliens appearing, then fast evacuation toward the bunker.
