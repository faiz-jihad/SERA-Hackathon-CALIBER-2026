# SERA — Technical Boundaries & Known Limitations

---

## 1. Operating Envelope Boundaries

1. **Telemetry Sampling Rate**: The prototype is optimized for weekly and daily averaged historian telemetry. High-frequency raw waveform time-waveform recordings ($> 10\text{ kHz}$) are pre-processed into overall RMS and discrete spectral harmonics (1X, 2X, 3X) prior to ingestion.
2. **Rotating Machinery Scope**: The current rule catalog is calibrated for **Class II, III, and IV rotating machinery** (centrifugal blowers, pumps, compressors, induction motors $> 300\text{ kW}$) governed by **ISO 10816-3**. Reciprocating compressors (ISO 10816-6) and piping acoustics require additional specialized rule modules.
3. **Connectivity Dependency**: While the system guarantees $100\%$ offline operation via deterministic fallback, advanced contextual phrasing benefits from external LLM API access (Gemini / OpenAI).
4. **Historical Database Volume**: The TF-IDF incident retrieval performs optimally with $\ge 5$ historical cases per asset class.

---

# SERA — Future Development Roadmap

---

## 🗺️ Release Roadmap (Phases 2 & 3)

### Phase 2: Near-Term Industrial Integrations (Q3 2026)
- **OPC-UA / MQTT IoT Ingestion**: Direct real-time streaming connector to Yokogawa Centum VP, Emerson DeltaV, and Honeywell Experion DCS historians.
- **Automated SAP RFC Connector**: Direct bidirectional integration with SAP S/4HANA PM module to automatically create official Maintenance Notifications (`IW21`) and Work Orders (`IW31`).
- **Full FFT Spectrogram Waterfall Viewer**: WebGL-powered 3D waterfall vibration spectral density viewer in the browser.

### Phase 3: Advanced Predictive Intelligence (Q4 2026+)
- **Physics-Informed Neural Networks (PINNs)**: Combining rotor-dynamics finite element models with operational telemetry for Remaining Useful Life (RUL) estimation.
- **Multimodal Oil & Thermography Ingestion**: Automated computer vision ingestion of FLIR infrared thermography images and laboratory spectrochemical oil analysis reports.
- **Edge Deployment (SERA Node)**: Containerized deployment on industrial edge PCs (e.g. Advantech, Siemens IPC) for zero-latency on-premise interlock monitoring.
