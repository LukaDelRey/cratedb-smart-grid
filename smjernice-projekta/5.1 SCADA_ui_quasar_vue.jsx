export default function SmartGridSCADA() {
  const alarms = [
    { id: 1, level: 'CRITICAL', text: 'Transformer Oil Temperature High' },
    { id: 2, level: 'WARNING', text: 'Voltage Instability Detected' },
    { id: 3, level: 'INFO', text: 'AI Forecast Updated' },
  ]

  const sensors = [
    { name: 'Voltage', value: '110 kV', status: 'normal' },
    { name: 'Current', value: '620 A', status: 'warning' },
    { name: 'Frequency', value: '49.98 Hz', status: 'normal' },
    { name: 'Oil Temperature', value: '87 °C', status: 'critical' },
    { name: 'Winding Temp', value: '93 °C', status: 'critical' },
    { name: 'Hydrogen', value: '420 ppm', status: 'warning' },
    { name: 'Methane', value: '180 ppm', status: 'normal' },
    { name: 'Acetylene', value: '15 ppm', status: 'normal' },
  ]

  const substations = [
    { id: 'TS-001', load: 82, health: 91, risk: 'LOW' },
    { id: 'TS-002', load: 93, health: 68, risk: 'HIGH' },
    { id: 'TS-003', load: 74, health: 88, risk: 'LOW' },
    { id: 'TS-004', load: 89, health: 73, risk: 'MEDIUM' },
  ]

  const statusColor = (status) => {
    if (status === 'critical') return 'bg-red-600'
    if (status === 'warning') return 'bg-orange-500'
    return 'bg-emerald-600'
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-4 font-sans">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-emerald-500 pb-4 mb-4">
        <div>
          <div className="text-4xl font-bold text-emerald-400">CrateDB</div>
          <div className="text-gray-400 mt-1">
            Smart Grid Digital Twin SCADA Platform
          </div>
        </div>

        <div className="flex gap-4">
          <div className="bg-[#111827] rounded-2xl px-6 py-3 shadow-lg border border-[#1f2937]">
            <div className="text-sm text-gray-400">Grid Health</div>
            <div className="text-3xl font-bold text-emerald-400">89%</div>
          </div>

          <div className="bg-[#111827] rounded-2xl px-6 py-3 shadow-lg border border-[#1f2937]">
            <div className="text-sm text-gray-400">Blackout Risk</div>
            <div className="text-3xl font-bold text-red-400">12%</div>
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-12 gap-4">

        {/* LEFT SIDEBAR */}
        <div className="col-span-3 space-y-4">

          {/* Transformer Status */}
          <div className="bg-[#111827] rounded-3xl p-5 border border-[#1f2937] shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold">Transformer TS-002</h2>
                <p className="text-gray-400 text-sm">Čakovec Distribution Grid</p>
              </div>

              <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse"></div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-gray-400 text-sm">Load</div>
                <div className="text-4xl font-bold text-orange-400">93%</div>
              </div>

              <div>
                <div className="text-gray-400 text-sm">Transformer Health</div>
                <div className="text-4xl font-bold text-red-400">68%</div>
              </div>

              <div>
                <div className="text-gray-400 text-sm">Predicted Lifetime</div>
                <div className="text-2xl font-bold">4.8 Years</div>
              </div>
            </div>
          </div>

          {/* Alarm Panel */}
          <div className="bg-[#111827] rounded-3xl p-5 border border-[#1f2937] shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Realtime Alarms</h2>

            <div className="space-y-3">
              {alarms.map((alarm) => (
                <div
                  key={alarm.id}
                  className={`rounded-xl p-3 border ${
                    alarm.level === 'CRITICAL'
                      ? 'border-red-500 bg-red-900/20'
                      : alarm.level === 'WARNING'
                      ? 'border-orange-500 bg-orange-900/20'
                      : 'border-blue-500 bg-blue-900/20'
                  }`}
                >
                  <div className="font-bold">{alarm.level}</div>
                  <div className="text-sm text-gray-300">{alarm.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER */}
        <div className="col-span-6 space-y-4">

          {/* Digital Twin */}
          <div className="bg-[#111827] rounded-3xl p-5 border border-[#1f2937] shadow-2xl h-[420px] relative overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Digital Twin Visualization</h2>
              <div className="text-emerald-400 font-bold">LIVE</div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center opacity-30">
              <div className="w-72 h-72 border-4 border-emerald-500 rounded-3xl rotate-12"></div>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-4 mt-10">
              <div className="bg-[#0f172a] rounded-2xl p-4 border border-[#1e293b]">
                <div className="text-gray-400 text-sm">Oil Temperature</div>
                <div className="text-5xl font-bold text-red-400 mt-2">87°C</div>
              </div>

              <div className="bg-[#0f172a] rounded-2xl p-4 border border-[#1e293b]">
                <div className="text-gray-400 text-sm">Voltage Stability</div>
                <div className="text-5xl font-bold text-orange-400 mt-2">92%</div>
              </div>

              <div className="bg-[#0f172a] rounded-2xl p-4 border border-[#1e293b]">
                <div className="text-gray-400 text-sm">AI Risk Score</div>
                <div className="text-5xl font-bold text-red-400 mt-2">0.81</div>
              </div>

              <div className="bg-[#0f172a] rounded-2xl p-4 border border-[#1e293b]">
                <div className="text-gray-400 text-sm">Predicted Load</div>
                <div className="text-5xl font-bold text-emerald-400 mt-2">+14%</div>
              </div>
            </div>
          </div>

          {/* Sensor Grid */}
          <div className="bg-[#111827] rounded-3xl p-5 border border-[#1f2937] shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Realtime Sensor Analytics</h2>
              <div className="text-gray-400">Updated every 500ms</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {sensors.map((sensor, idx) => (
                <div
                  key={idx}
                  className="bg-[#0f172a] rounded-2xl p-4 border border-[#1e293b] flex justify-between items-center"
                >
                  <div>
                    <div className="text-gray-400 text-sm">{sensor.name}</div>
                    <div className="text-2xl font-bold mt-1">{sensor.value}</div>
                  </div>

                  <div className={`w-4 h-4 rounded-full ${statusColor(sensor.status)}`}></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="col-span-3 space-y-4">

          {/* Forecasting */}
          <div className="bg-[#111827] rounded-3xl p-5 border border-[#1f2937] shadow-2xl">
            <h2 className="text-xl font-bold mb-4">AI Forecasting</h2>

            <div className="space-y-4">
              <div className="bg-[#0f172a] rounded-2xl p-4 border border-[#1e293b]">
                <div className="text-gray-400 text-sm">Load Prediction</div>
                <div className="text-3xl font-bold text-orange-400">+14%</div>
                <div className="text-xs text-gray-500 mt-1">Next 30 min</div>
              </div>

              <div className="bg-[#0f172a] rounded-2xl p-4 border border-[#1e293b]">
                <div className="text-gray-400 text-sm">Blackout Probability</div>
                <div className="text-3xl font-bold text-red-400">12%</div>
                <div className="text-xs text-gray-500 mt-1">Cascade Risk Model</div>
              </div>

              <div className="bg-[#0f172a] rounded-2xl p-4 border border-[#1e293b]">
                <div className="text-gray-400 text-sm">Remaining Lifetime</div>
                <div className="text-3xl font-bold text-emerald-400">4.8y</div>
                <div className="text-xs text-gray-500 mt-1">Transformer Aging Model</div>
              </div>
            </div>
          </div>

          {/* Grid Nodes */}
          <div className="bg-[#111827] rounded-3xl p-5 border border-[#1f2937] shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Substation Network</h2>

            <div className="space-y-3">
              {substations.map((station, idx) => (
                <div
                  key={idx}
                  className="bg-[#0f172a] rounded-2xl p-4 border border-[#1e293b]"
                >
                  <div className="flex justify-between items-center">
                    <div className="font-bold">{station.id}</div>
                    <div
                      className={`text-xs font-bold px-2 py-1 rounded-full ${
                        station.risk === 'HIGH'
                          ? 'bg-red-500/20 text-red-400'
                          : station.risk === 'MEDIUM'
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {station.risk}
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-gray-400">
                    Load: {station.load}%
                  </div>

                  <div className="w-full bg-[#1e293b] rounded-full h-2 mt-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full"
                      style={{ width: `${station.health}%` }}
                    ></div>
                  </div>

                  <div className="text-xs text-gray-500 mt-1">
                    Health: {station.health}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
