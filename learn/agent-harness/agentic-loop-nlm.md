# The Agentic Loop: How an AI Agent Actually Works

**Topic:** the single most important idea in AI agents — the loop that makes one work.
**Audience:** a software engineer who is new to how agents work inside and wants to explain it clearly.
**Goal:** after this, they can picture the loop turning, follow one real run, and see why it is the foundation for everything else.
**Feel:** a short, confident tech documentary that makes a hidden mechanism suddenly obvious.

## The one big idea

An AI agent is not a smarter model. An agent is a simple loop wrapped around a smart model. The loop keeps asking the model one question — "what should we do next?" — does whatever the model asks, shows it the result, and repeats until the model says it is finished.

The loop is simple. The model is smart. All the engineering lives in the wrapper around them. That wrapper has a name: the harness. The whole idea is like a thermostat wrapped around a thermometer — the thermometer is smart about reading the temperature, but it is the simple loop around it that actually keeps checking, acting, and checking again until the room is right.

## The loop is a circle with four stations

Picture a glowing signal traveling around a circle, passing through four stations again and again until the work is done.

### Station 1 — Think

The only station with intelligence. The harness shows the model everything so far: the request, the available tools, and every result gathered. The model chooses one next move — either "use this tool" or "I am done, here is the answer." It never acts. It only decides.

### Station 2 — Act

The harness — plain code, no intelligence — carries out what the model asked: runs the command, reads the file, calls the service. The model is a brain that can only speak; the harness is the pair of hands. This is also where permission is checked: is the agent even allowed to do that?

### Station 3 — Observe

The result is written back into the running transcript. Here is the surprise: the model has no memory of its own. Every lap, it re-reads the whole transcript from the start. That growing transcript is the agent's memory. There is nothing else.

### Station 4 — Done?

A plain check: did the model ask for a tool, or give a final answer? An answer ends the loop. A tool request sends the signal around again — anywhere from one lap to fifty or more before the work is finished.

That is the whole machine: Think, Act, Observe, check, repeat. Every agent product — coding assistants, research agents, support bots — is this same circle in different clothes.

## Watch one real run, in five laps

A developer says: "the date test is failing, please fix it." Follow the signal around the circle five times.

**Lap 1.** The model thinks "see the failure first," runs the tests, and learns the date test failed — it expected a real date but got "invalid date."

**Lap 2.** It thinks "read the code," opens the file, and finds the bug: the parser expects day-first dates, but the callers send year-first dates.

**Lap 3.** It thinks "the format is wrong," and edits the file to the correct year-first format.

**Lap 4.** The important one: it thinks "never trust a fix — verify," runs the tests again, and all of them pass. Nobody told it to re-check; a good agent closes its own loop.

**Lap 5.** It thinks "verified, nothing left," gives its final answer, and the loop exits.

## Failure is a lap, not a crash

This is most of why agents feel resilient. When a tool errors — a missing file, a failed test — the harness does not stop. It feeds the error back into the transcript as just another observation, and on the next lap the model reads it and tries a different move. The agent stumbling and recovering, instead of falling over, comes from this one design choice.

The loop also has clean ways to stop: the model saying it is done (the normal exit), the human interrupting, a hard limit on laps or money, a refused permission, or a fatal error the harness surfaces instead of spinning forever.

## Why this one loop is the foundation

Once the loop is clear, every other topic becomes a knob on this same machine. Managing the transcript when it grows too big is context engineering. Writing the model's instructions is prompt engineering. Shaping the menu of tools is tool design. Running many loops at once is orchestration. Guarding what the agent may touch is permissions. Grading whole runs is evals. Understand the loop, and the rest stops being buzzwords and becomes one understandable machine.

## Remember five things

- An agent is a simple loop around a smart model; the model is the brain, the loop and tools are the body, and the whole wrapper is the harness.
- The loop repeats four stations: Think (decide one move), Act (the harness does it), Observe (record the result), and a check for done.
- The model has no memory of its own; it re-reads the whole growing transcript every lap, and that transcript is its only memory.
- A failure is a lap, not a crash: errors feed back as observations and the model adapts next lap.
- Every other agent topic — context, prompting, tools, orchestration, permissions, evals — is just a knob on this one loop.
