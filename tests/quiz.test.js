const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

class FakeElement {
  constructor(id = "") {
    this.id = id;
    this.hidden = false;
    this.disabled = false;
    this.textContent = "";
    this.style = {};
    this.attributes = {};
    this.children = [];
    this.listeners = {};
    this.classNames = new Set();
    this.classList = {
      add: (...names) => names.forEach((name) => this.classNames.add(name)),
      contains: (name) => this.classNames.has(name),
      toggle: (name, force) => {
        const shouldAdd = force === undefined ? !this.classNames.has(name) : force;
        if (shouldAdd) this.classNames.add(name);
        else this.classNames.delete(name);
        return shouldAdd;
      }
    };
  }

  set className(value) {
    this.classNames = new Set(value.split(/\s+/).filter(Boolean));
  }

  get className() {
    return [...this.classNames].join(" ");
  }

  set innerHTML(value) {
    this.answerText = value.match(/<span>(.*?)<\/span>$/)?.[1] ?? "";
  }

  addEventListener(name, listener) {
    this.listeners[name] = listener;
  }

  click() {
    this.listeners.click?.();
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  replaceChildren(...children) {
    this.children = children;
  }

  appendChild(child) {
    this.children.push(child);
  }

  querySelectorAll(selector) {
    return selector === ".answer" ? this.children : [];
  }
}

function createQuiz(random = () => 0) {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, "expected the quiz to contain its inline script");

  const ids = [
    "welcome-screen", "quiz-screen", "result-screen", "progress-label",
    "score-label", "progress-track", "progress-fill", "question-number",
    "question-text", "answer-list", "feedback", "next-button",
    "celebration-confetti", "result-emoji", "result-title", "final-score",
    "result-message", "start-button", "restart-button"
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, new FakeElement(id)]));
  const document = {
    activeElement: null,
    createElement: (tagName) => new FakeElement(tagName),
    getElementById: (id) => elements[id]
  };
  Object.values(elements).forEach((element) => {
    element.ownerDocument = document;
  });
  const math = Object.create(Math);
  math.random = random;
  const context = vm.createContext({ document, Math: math });
  vm.runInContext(
    `${script}\nglobalThis.quizTestState = { get bank() { return questions; }, get mission() { return missionQuestions; }, get score() { return score; } };`,
    context
  );

  return { elements, state: context.quizTestState };
}

test("missions shuffle all questions and choices while preserving answer correctness", () => {
  const { elements, state } = createQuiz();
  elements["start-button"].click();

  const bank = Array.from(state.bank);
  const mission = Array.from(state.mission);
  assert.equal(mission.length, 10);
  assert.equal(new Set(mission.map(({ question }) => question)).size, 10);
  assert.notDeepEqual(
    mission.map(({ question }) => question),
    bank.map(({ question }) => question)
  );
  for (const item of mission) {
    const original = bank.find(({ question }) => question === item.question);
    assert.deepEqual([...item.options].sort(), [...original.options].sort());
    assert.equal(item.options[item.answer], original.options[original.answer]);
    assert.notDeepEqual([...item.options], [...original.options]);
  }
  assert.equal(elements["question-text"].textContent, mission[0].question);
  assert.equal(elements["question-text"].ownerDocument.activeElement, elements["question-text"]);
});

test("feedback, scoring, progress, results, and restart follow the shuffled mission", () => {
  const { elements, state } = createQuiz();
  elements["start-button"].click();
  assert.equal(elements["question-text"].ownerDocument.activeElement, elements["question-text"]);
  assert.equal(elements["progress-track"].attributes["aria-valuenow"], "0");
  assert.equal(elements["progress-fill"].style.width, "0%");

  const first = state.mission[0];
  elements["answer-list"].children[first.answer].click();
  assert.match(elements.feedback.textContent, /Brilliant!/);
  assert.equal(state.score, 1);
  assert.ok(elements["answer-list"].children[first.answer].classList.contains("correct"));
  assert.equal(elements["progress-track"].attributes["aria-valuenow"], "1");
  assert.equal(elements["progress-fill"].style.width, "10%");

  elements["next-button"].click();
  assert.equal(elements["question-text"].ownerDocument.activeElement, elements["question-text"]);
  const second = state.mission[1];
  const wrongIndex = second.answer === 0 ? 1 : 0;
  elements["answer-list"].children[wrongIndex].click();
  assert.match(elements.feedback.textContent, /^Not quite /);
  assert.ok(elements.feedback.textContent.includes(`${second.options[second.answer]} is correct.`));
  assert.equal(state.score, 1);
  assert.ok(elements["answer-list"].children[second.answer].classList.contains("correct"));
  assert.equal(elements["progress-track"].attributes["aria-valuenow"], "2");

  for (let index = 2; index < state.mission.length; index += 1) {
    elements["next-button"].click();
    elements["answer-list"].children[state.mission[index].answer].click();
  }
  assert.equal(elements["progress-track"].attributes["aria-valuenow"], "10");
  assert.equal(elements["progress-fill"].style.width, "100%");
  elements["next-button"].click();
  assert.equal(elements["final-score"].textContent, "9 / 10 correct");
  assert.equal(elements["celebration-confetti"].hidden, false);
  assert.equal(elements["result-screen"].classList.contains("celebrate"), true);
  assert.equal(elements["result-title"].ownerDocument.activeElement, elements["result-title"]);

  const previousOrder = Array.from(state.mission, ({ question }) => question);
  elements["restart-button"].click();
  const restartedOrder = Array.from(state.mission, ({ question }) => question);
  assert.notDeepEqual(restartedOrder, previousOrder);
  assert.equal(state.score, 0);
  assert.equal(elements["progress-track"].attributes["aria-valuenow"], "0");
  assert.equal(elements["progress-fill"].style.width, "0%");
  assert.equal(elements["question-text"].ownerDocument.activeElement, elements["question-text"]);
});
