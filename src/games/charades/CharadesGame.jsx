                      The prompt is only for {currentTurn.actingPlayer}.
                    </div>
                    <button
                      type="button"
                      className="primary-button full-button"
                      onClick={handleStartActing}
                    >
                      Reveal my prompt
                    </button>
                  </>
                )}
              </div>
            )}

            {phase === "acting" && (
              <>
                <div className="charades-card">
                  <span className="charades-secret-label">Acting now</span>
                  <h2>{currentPlayerName}</h2>

                  <div className="charades-controls">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setIsPaused((previous) => !previous)}
                    >
                      {isPaused ? <Play size={16} /> : <Pause size={16} />}
                      {isPaused ? "Resume" : "Pause"}
                    </button>
                  </div>

                  <div className="charades-actions">
                    <button type="button" className="primary-button" onClick={handleCorrect}>
                      Correct
                    </button>
                    <button type="button" className="secondary-button" onClick={handleSkip}>
                      <SkipForward size={16} />
                      Skip
                    </button>
                    <button type="button" className="secondary-button" onClick={handleEndTurn}>
                      End Turn
                    </button>
                  </div>
                </div>

                <div className="charades-scoreboard">
                  <div className="leaderboard-header">
                    <Trophy size={18} />
                    <span>Live Score</span>
                  </div>

                  {teamScores.map((team) => (
                    <div key={team.teamId} className="leaderboard-row">
                      <span className="leaderboard-rank">{team.name}</span>
                      <span>{team.score} pts</span>
                      <strong>{team.correctAnswers} correct</strong>
                    </div>
                  ))}
                </div>
              </>
            )}

            {phase === "scoreboard" && (
              <div className="charades-card">
                <h2>Turn complete</h2>
                <p>Nice work. The next team is up in a moment.</p>
              </div>
            )}
          </>
        )}

        {phase === "results" && (
          <>
            <span className="section-kicker">FINAL RESULTS</span>
            <h1>
              {winners.length > 1 ? "It’s a tie!" : `${winners[0]?.name || "No winner"} wins!`}
            </h1>

            <div className="results-card">
              <div className="winner-banner">
                <Trophy size={20} />
                <span>
                  {winners.length > 1
                    ? `Tied teams: ${winners.map((team) => team.name).join(", ")}`
                    : `Winner: ${winners[0]?.name || "Tied"}`}
                </span>
              </div>

              {teamScores
                .slice()
                .sort((a, b) => b.score - a.score || b.correctAnswers - a.correctAnswers)
                .map((team, index) => (
                  <div key={team.teamId} className="results-row">
                    <div className="result-name">
                      <span>#{index + 1}</span>
                      <strong>{team.name}</strong>
                    </div>

                    <div className="result-stats">
                      <span>{team.score} pts</span>
                      <span>{team.correctAnswers} correct</span>
                      <span>{team.skippedPrompts} skipped</span>
                      <span>{team.turnsPlayed} turns</span>
                    </div>
                  </div>
                ))}

              <div className="results-actions">
                <button type="button" className="primary-button" onClick={restartGame}>
                  <RotateCcw size={18} />
                  Play Again
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => navigate("/")}
                >
                  Return to Games
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
