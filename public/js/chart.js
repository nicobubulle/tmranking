if (typeof matches !== 'undefined') {
  const playersDataWithColors = matches.reduce((players, match) => {
    match.players.forEach(player => {
      if (!players[player.name]) {
        players[player.name] = {
          data: [],
          color: player.color
        };
      }
      players[player.name].data.push({
        x: match.matchNumber,
        y: parseFloat(player.newRank)
      });
    });
    return players;
  }, {});
  
  const tooltips = matches.map(match => ({
    matchNumber: match.matchNumber,
    matchDate: match.matchDate,
    winner: match.winner,
    players: match.players
  }));
  
  const datasets = Object.entries(playersDataWithColors).map(([playerName, playerData]) => ({
    label: playerName,
    data: [{ x: 0, y: 1000 }, ...playerData.data],
    fill: false,
    borderColor: playerData.color,
    backgroundColor: playerData.color,
    tension: 0.2,
    spanGaps: true,
    pointRadius: 3
  }));
  
  const config = {
    type: 'line',
    data: {
      datasets: datasets
    },
    options: {
      responsive: true,
      usePointStyle: true,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Évolution des scores des joueurs'
        },
        tooltip: {
          enabled: true,
          usePointStyle: true,
          boxWidth: 10,
            mode: "nearest",
            axis: "x",
            intersect: false,
          callbacks: {
            title: function (context) {
              const matchIndex = context[0].dataIndex - 1;
              if (matchIndex < 0) {
                return 'Match 0';
              }
              return `Match ${tooltips[matchIndex].matchNumber} (${tooltips[matchIndex].matchDate})`;
            },
            footer: function (context) {
              const matchIndex = context[0].dataIndex - 1;
              if (matchIndex < 0) {
                return '';
              }
              const winner = tooltips[matchIndex].winner;
              return `Gagnant: ${winner}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: 'Numéro du match'
          },
          ticks: {
            stepSize: 1,
            precision: 0
          },
          min: 0
        },
        y: {
          title: {
            display: true,
            text: 'Points'
          },
          min: 850,
          max: 1150
        }
      }
    },
  };
  
  const chart = new Chart(document.getElementById('chart'), config);
}
