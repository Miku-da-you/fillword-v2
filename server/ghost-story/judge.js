"use strict";

function judgeAnswers(questions, answers) {
  let correctCount = 0;
  const totalCount = (questions || []).length;

  for (const question of questions || []) {
    const submitted = answers ? answers[question.id] : undefined;
    const correct = question.type === "true_false"
      ? submitted === question.answer
      : Number(submitted) === Number(question.correctIndex);
    if (correct) correctCount++;
  }

  return {
    correctCount,
    totalCount,
    accuracy: totalCount ? correctCount / totalCount : 0,
  };
}

module.exports = { judgeAnswers };
