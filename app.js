const firebaseConfig = {
  apiKey: "AIzaSyDShPnrhxN5F1vNRK1sCXTV2Ni6iWQJxpM",
  projectId: "airquality-71cef"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
db.settings({ timestampsInSnapshots: true });

const chartDiv = document.getElementById("chart");
const timeRangeSelect = document.getElementById("timeRange");
const aggregationSelect = document.getElementById("aggregation");
const refreshBtn = document.getElementById("refresh");
let chart;
let selectedMonth = new Date();
function chicagoTime(date) {
  return new Date(date.toLocaleString("en-US", {timeZone: "America/Chicago"}));
}
timeRangeSelect.addEventListener("change", () => {
  if (timeRangeSelect.value === "month") {
    document.getElementById("monthSelector").style.display = "inline-flex";
    updateMonthLabel();
  } else {
    document.getElementById("monthSelector").style.display = "none";
  }
});
function updateMonthLabel() {
  const options = { year: "numeric", month: "long" };
  document.getElementById("currentMonth").textContent = selectedMonth.toLocaleDateString("en-US", options);
}

document.getElementById("prevMonth").addEventListener("click", () => {
  selectedMonth.setMonth(selectedMonth.getMonth() - 1);
  updateMonthLabel();
  refreshChart();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  selectedMonth.setMonth(selectedMonth.getMonth() + 1);
  updateMonthLabel();
  refreshChart();
});

function processData(snapshot) {
  const readings = snapshot.docs.map(doc => {
    const d = doc.data();
    return {
      timestamp: chicagoTime(new Date(d.timestamp)),
      small: parseInt(d.small),
      large: parseInt(d.large),
      date: d.date
    };
  });
  const filtered = filterTimeRange(readings, timeRangeSelect.value);
  const aggregated = aggregateData(filtered, aggregationSelect.value);
    aggregated.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    return aggregated;
}
function filterTimeRange(readings, range) {
  const now = new Date();
  let cutoff;
  if (range === "day") cutoff = new Date(now.getTime() - 24*60*60*1000);
  else if (range === "week") cutoff = new Date(now.getTime() - 7*24*60*60*1000);
  else if (range === "month") cutoff = new Date(now.getTime() - 30*24*60*60*1000);
  else if (range === "hour") cutoff = new Date(now.getTime() - 60*60*1000);
  else if (range === "monthly") {
    const start = newDate(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
    const end = newDate(selectedMonth.getFullYear(), selectedMonth.getMonth()+1, 1);
    return readings.filter(r => r.timestamp >= start && r.timestamp < end);
  }
  else cutoff = new Date(0);

  return readings.filter(r => r.timestamp > cutoff);
}

// Aggregate data
function aggregateData(readings, aggregation) {
  if (aggregation === "raw") return readings;

  const grouped = {};
  readings.forEach(r => {
    let key, dateObj;
    if (aggregation === "hourly") {
      key = r.timestamp.getFullYear() + "-" +
            (r.timestamp.getMonth()+1) + "-" +
            r.timestamp.getDate() + " " +
            r.timestamp.getHours();
      dateObj = new Date(r.timestamp.getFullYear(), r.timestamp.getMonth(), r.timestamp.getDate(), r.timestamp.getHours());
    } else if (aggregation === "daily") {
      key = r.date;
      const parts = key.split("-");
      dateObj = new Date(parts[0], parts[1]-1, parts[2]);
    } else if (aggregation === "weekly") {
      const onejan = new Date(r.timestamp.getFullYear(),0,1);
      const week = Math.ceil((((r.timestamp - onejan) / 86400000) + onejan.getDay()+1)/7);
      key = r.timestamp.getFullYear() + "-W" + week;
      dateObj = new Date(r.timestamp.getFullYear(),0, (week-1)*7);
    }

    if (!grouped[key]) grouped[key] = { small: [], large: [], timestamp: dateObj };
    grouped[key].small.push(r.small);
    grouped[key].large.push(r.large);
  });

  return Object.keys(grouped).map(key => {
    const smallAvg = grouped[key].small.reduce((a,b)=>a+b,0)/grouped[key].small.length;
    const largeAvg = grouped[key].large.reduce((a,b)=>a+b,0)/grouped[key].large.length;
    return { timestamp: grouped[key].timestamp, small: smallAvg, large: largeAvg };
  });
}

// Draw or update Highcharts
function drawChart(readings) {
  const smallData = readings.map(r => [r.timestamp.getTime(), r.small]);
  const largeData = readings.map(r => [r.timestamp.getTime(), r.large]);

  if (!chart) {
    Highcharts.setOptions({
      time: { timezone: 'America/Chicago'}
    });
    chart = Highcharts.chart(chartDiv, {
      chart: { type: 'line', backgroundColor: '#2a2a3d' },
      title: { text: 'Air Quality Particle Counts', style: { color: '#fff' } },
      xAxis: { 
        type: 'datetime', 
        title: { text: 'Time', style: { color: '#fff' } },
        labels: { style: { color: '#fff' } }
      },
      yAxis: { 
        title: { text: 'Particle Count', style: { color: '#fff' } },
        labels: { style: { color: '#fff' } }
      },
      series: [
        { name: 'Small', data: smallData, color: '#00aaff' },
        { name: 'Large', data: largeData, color: '#ff5555' }
      ],
      legend: { itemStyle: { color: '#fff' } },
      credits: { enabled: false }
    });
  } else {
    chart.series[0].setData(smallData, false);
    chart.series[1].setData(largeData, false);
    chart.redraw();
  }
}

// Real-time Firestore listener
db.collection("data").onSnapshot(snapshot => {
  window.lastSnapshot = snapshot;
const processed = processData(snapshot);
drawChart(processed);
}, error => {
  debugLog('Firestore error:', error);
});

// Refresh button for aggregation/time range change
refreshBtn.addEventListener("click", async () => {
  // Force the real-time listener to re-process with current filter settings
  // Just trigger a re-process of the last snapshot data
  if (window.lastSnapshot) {
    const processed = processData(window.lastSnapshot);
    drawChart(processed);
  }
});
