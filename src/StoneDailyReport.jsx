import React, { useState, useEffect } from "react";
import "./styles.css";

// SVG-иконки
const PencilIcon = () => (
  <svg
    width="18"
    height="18"
    fill="none"
    stroke="#374151"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg
    width="18"
    height="18"
    fill="none"
    stroke="#dc2626"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const CrossIcon = () => (
  <svg
    width="16"
    height="16"
    fill="none"
    stroke="#bbb"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function StoneDailyReport() {
  const [sheetOptions, setSheetOptions] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [positions, setPositions] = useState([]);
  const [reportDate, setReportDate] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [kolvo, setKolvo] = useState("");
  const [sizeInput, setSizeInput] = useState("");
  const [vidInput, setVidInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [bySize, setBySize] = useState({});
  const [sizes, setSizes] = useState([]);
  const [showSizes, setShowSizes] = useState(false);
  const [showVids, setShowVids] = useState(false);
  const [formError, setFormError] = useState("");

  // наличие по размеру (null — ещё не запрашивали, число — результат)
  const [sizeAvailability, setSizeAvailability] = useState(null);

  // загрузка сотрудников и номенклатуры
  useEffect(() => {
    async function fetchSheets() {
      const res = await fetch("https://lpaderina.store/webhook/rabotniki");
      const dataSheets = await res.json();
      if (dataSheets.list_name) {
        setSheetOptions(JSON.parse(dataSheets.list_name));
      } else if (Array.isArray(dataSheets) && dataSheets[0]?.list_name) {
        try {
          setSheetOptions(JSON.parse(dataSheets[0].list_name));
        } catch {
          setSheetOptions([]);
        }
      }
    }
    async function fetchNomenclature() {
      const resNomenclature = await fetch(
        "https://lpaderina.store/webhook/nomenklatura"
      );
      const dataNomenclature = await resNomenclature.json();
      setBySize(dataNomenclature.bySize || {});
      setSizes(Object.keys(dataNomenclature.bySize || {}));
    }
    fetchSheets();
    fetchNomenclature();
  }, []);

  // вебхук для получения наличия по размеру
  const fetchSizeAvailability = async (size) => {
    if (!size) {
      setSizeAvailability(null);
      return;
    }

    try {
      const res = await fetch(
        "https://lpaderina.store/webhook/size_availability",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ size }),
        }
      );

      if (!res.ok) {
        setSizeAvailability(null);
        return;
      }

      const data = await res.json();

      // ожидаем формат от n8n: [] или [ { qty: 5 } ]
      let qty = null;

      if (Array.isArray(data)) {
        if (data.length === 0) {
          // пустой массив — остатка нет
          qty = 0;
        } else {
          const first = data[0];
          if (first && typeof first === "object" && "qty" in first) {
            qty = first.qty;
          }
        }
      } else if (typeof data === "number") {
        qty = data;
      } else if (data && typeof data === "object" && "qty" in data) {
        qty = data.qty;
      }

      setSizeAvailability(qty);
    } catch (e) {
      setSizeAvailability(null);
    }
  };

  // форматирование даты для бэка (DD.MM.YYYY)
  const formatDateForBackend = (isoDate) => {
    if (!isoDate) return "";
    const [year, month, day] = isoDate.split("-");
    return `${day}.${month}.${year}`;
  };

  // общий метод: загрузить задания по дате и фамилии
  const loadDailyTask = async (dateIso, sheet) => {
    if (!dateIso || !sheet) return;

    setShowSuccess(false);
    setFormError("");

    const dateToSend = formatDateForBackend(dateIso);

    try {
      const res = await fetch(
        "https://lpaderina.store/webhook/daily_task_sasha",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheet,
            date: dateToSend,
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setPositions(data);
        } else {
          setPositions(data.positions || []);
        }
      } else {
        setPositions([]);
      }
    } catch {
      setPositions([]);
    }
  };

  // смена даты
  const handleDateChange = async (e) => {
    const value = e.target.value; // YYYY-MM-DD
    setReportDate(value);
    setFormError("");
    setShowSuccess(false);
    setEditIndex(null);
    setIsAdding(false);
    setKolvo("");
    setSizeInput("");
    setVidInput("");
    setSizeAvailability(null);

    if (selectedSheet && value) {
      await loadDailyTask(value, selectedSheet);
    } else {
      setPositions([]);
    }
  };

  // смена фамилии
  const handleSelectSheet = async (e) => {
    const value = e.target.value;
    setSelectedSheet(value);
    setEditIndex(null);
    setIsAdding(false);
    setKolvo("");
    setSizeInput("");
    setVidInput("");
    setFormError("");
    setShowSuccess(false);
    setSizeAvailability(null);

    if (value && reportDate) {
      await loadDailyTask(reportDate, value);
    } else {
      setPositions([]);
    }
  };

  // проверка дубля
  function isDuplicate(size, vid, ignoreIndex = null) {
    return positions.some(
      (pos, idx) => idx !== ignoreIndex && pos.size === size && pos.vid === vid
    );
  }

  const handleSave = () => {
    setFormError("");

    // добавление
    if (editIndex === null && sizeInput && vidInput && kolvo) {
      if (isDuplicate(sizeInput, vidInput)) {
        setFormError(
          "Такая позиция уже добавлена. Вы можете её отредактировать."
        );
        return;
      }
      setPositions([
        ...positions,
        { size: sizeInput, vid: vidInput, qty: kolvo },
      ]);
      setSizeInput("");
      setVidInput("");
      setKolvo("");
      setIsAdding(false);
      setSizeAvailability(null);
      return;
    }

    // редактирование
    if (editIndex !== null && kolvo) {
      const editingSize = positions[editIndex].size;
      const editingVid = positions[editIndex].vid;
      if (isDuplicate(editingSize, editingVid, editIndex)) {
        setFormError("Такая позиция уже есть. Вы можете её отредактировать.");
        return;
      }
      const updated = [...positions];
      updated[editIndex] = { ...updated[editIndex], qty: kolvo };
      setPositions(updated);
      setEditIndex(null);
      setKolvo("");
      setIsAdding(false);
      return;
    }
  };

  const handleAddPosition = () => {
    setEditIndex(null);
    setIsAdding(true);
    setSizeInput("");
    setVidInput("");
    setKolvo("");
    setFormError("");
    setSizeAvailability(null);
  };

  const handleEditPosition = (index) => {
    const pos = positions[index];
    setKolvo(pos.qty);
    setEditIndex(index);
    setIsAdding(true);
    setSizeInput(pos.size);
    setVidInput(pos.vid);
    setFormError("");
    setSizeAvailability(null); // при редактировании количества наличие не нужно
  };

  const handleDeletePosition = (index) => {
    const updated = [...positions];
    updated.splice(index, 1);
    setPositions(updated);
    setEditIndex(null);
    setIsAdding(false);
    setSizeInput("");
    setVidInput("");
    setKolvo("");
    setFormError("");
    setSizeAvailability(null);
  };

  const handleSubmit = async () => {
    const positionsToSend = positions.map((pos) => ({
      ...pos,
      qty: Number(pos.qty),
    }));

    const dateToSend = formatDateForBackend(reportDate);

    await fetch("https://lpaderina.store/webhook/task_sasha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        positions: positionsToSend,
        sheet: selectedSheet,
        date: dateToSend,
      }),
    });
    setShowSuccess(true);
    setPositions([]);
    setEditIndex(null);
    setKolvo("");
    setIsAdding(false);
    setSizeAvailability(null);
    setTimeout(() => setShowSuccess(false), 4000);
  };

  const filteredSizes = sizes.filter((s) =>
    s.toLowerCase().includes(sizeInput.toLowerCase())
  );
  const currentVidOptions = bySize[sizeInput] || [];
  const filteredVids = currentVidOptions.filter((v) =>
    v.toLowerCase().includes(vidInput.toLowerCase())
  );

  return (
    <div className="daily-form-main">
      {/* 1. Дата */}
      <div className="daily-title">
        <label>Дата</label>
        <input
          type="date"
          className="daily-input"
          value={reportDate}
          onChange={handleDateChange}
        />
      </div>

      {/* 2. Фамилия */}
      <div className="daily-title" style={{ marginTop: 16 }}>
        <label>Фамилия</label>
        <select
          className="daily-input"
          value={selectedSheet}
          onChange={handleSelectSheet}
        >
          <option value="">Фамилия...</option>

          {sheetOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {formError && !isAdding && (
        <div
          style={{
            color: "#dc2626",
            background: "#fee2e2",
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 15,
            marginTop: 8,
          }}
        >
          {formError}
        </div>
      )}

      {selectedSheet && reportDate && (
        <>
          {showSuccess ? (
            <div>
              <div className="daily-title">
                Дата: {formatDateForBackend(reportDate) || "—"}
              </div>
              <div
                className="daily-sub"
                style={{
                  marginTop: 40,
                  fontSize: 24,
                  textAlign: "center",
                  color: "#22c55e",
                }}
              >
                Задание добавлено!
              </div>
            </div>
          ) : (
            <>
              <div className="daily-title">
                Дата: {formatDateForBackend(reportDate) || "—"}
              </div>
              <div className="daily-sub">Список позиций:</div>

              {((!positions.length && reportDate) ||
                (positions.length === 1 &&
                  !positions[0].size &&
                  !positions[0].vid &&
                  !positions[0].qty)) && (
                <div
                  style={{
                    margin: "16px 0",
                    textAlign: "center",
                    color: "#999",
                    fontSize: 18,
                  }}
                >
                  Добавь позиции вручную
                </div>
              )}

              <ul className="daily-list" style={{ marginTop: 14 }}>
                {positions.map((pos, i) => (
                  <React.Fragment key={i}>
                    {(pos.size || pos.vid || pos.qty) && (
                      <li>
                        <span>
                          {pos.size} {pos.vid} — {pos.qty} шт.
                        </span>
                        <span
                          style={{
                            display: "flex",
                            gap: 8,
                            marginLeft: "auto",
                          }}
                        >
                          <button
                            className="icon-btn"
                            title="Редактировать"
                            onClick={() => handleEditPosition(i)}
                          >
                            <PencilIcon />
                          </button>
                          <button
                            className="icon-btn"
                            title="Удалить"
                            onClick={() => handleDeletePosition(i)}
                          >
                            <TrashIcon />
                          </button>
                        </span>
                      </li>
                    )}
                    {isAdding && editIndex === i && (
                      <li>
                        <div
                          className="daily-edit-form"
                          style={{ marginTop: 8, marginBottom: 10 }}
                        >
                          <div
                            className="daily-field"
                            style={{ position: "relative" }}
                          >
                            <label>Размер</label>
                            <input
                              type="text"
                              className="daily-input"
                              value={positions[i].size}
                              readOnly
                              disabled
                            />
                          </div>
                          <div
                            className="daily-field"
                            style={{ position: "relative" }}
                          >
                            <label>Вид работы</label>
                            <input
                              type="text"
                              className="daily-input"
                              value={positions[i].vid}
                              readOnly
                              disabled
                            />
                          </div>
                          <div
                            className="daily-field"
                            style={{ position: "relative" }}
                          >
                            <label>Количество</label>
                            <input
                              type="number"
                              className="daily-input"
                              min="1"
                              value={kolvo}
                              onChange={(e) => setKolvo(e.target.value)}
                            />
                            {kolvo && (
                              <button
                                type="button"
                                className="clear-btn"
                                onClick={() => setKolvo("")}
                                tabIndex={-1}
                                aria-label="Очистить поле"
                              >
                                <CrossIcon />
                              </button>
                            )}
                          </div>
                          {formError && (
                            <div
                              style={{
                                color: "#dc2626",
                                background: "#fee2e2",
                                padding: "6px 12px",
                                borderRadius: 8,
                                fontSize: 15,
                                margin: "8px 0",
                              }}
                            >
                              {formError}
                            </div>
                          )}
                          <div className="daily-flex">
                            <button
                              className="daily-btn-main"
                              onClick={handleSave}
                              disabled={!kolvo}
                            >
                              Сохранить
                            </button>
                            <button
                              className="daily-btn-alt daily-btn-small"
                              style={{ marginLeft: 8 }}
                              onClick={() => {
                                setIsAdding(false);
                                setEditIndex(null);
                                setKolvo("");
                                setFormError("");
                                setSizeAvailability(null);
                              }}
                            >
                              Завершить редактирование
                            </button>
                          </div>
                        </div>
                      </li>
                    )}
                  </React.Fragment>
                ))}

                {isAdding && editIndex === null && (
                  <li>
                    <div
                      className="daily-edit-form"
                      style={{ marginTop: 8, marginBottom: 10 }}
                    >
                      <div
                        className="daily-field"
                        style={{ position: "relative" }}
                      >
                        <label>Размер</label>
                        <input
                          type="text"
                          className="daily-input"
                          placeholder="Начните вводить или выберите..."
                          value={sizeInput}
                          onChange={(e) => {
                            const value = e.target.value;
                            setSizeInput(value);
                            setShowSizes(true);
                            setVidInput("");
                            setSizeAvailability(null); // при ручном вводе — сброс
                          }}
                          onFocus={() => setShowSizes(true)}
                          onBlur={() =>
                            setTimeout(() => setShowSizes(false), 100)
                          }
                          autoComplete="off"
                        />
                        {sizeInput && (
                          <button
                            type="button"
                            className="clear-btn"
                            onClick={() => {
                              setSizeInput("");
                              setSizeAvailability(null);
                            }}
                            tabIndex={-1}
                            aria-label="Очистить поле"
                          >
                            <CrossIcon />
                          </button>
                        )}
                        <button
                          type="button"
                          className="combo-arrow"
                          tabIndex={-1}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setShowSizes((v) => !v);
                          }}
                        >
                          ▼
                        </button>
                        {showSizes && filteredSizes.length > 0 && (
                          <div className="daily-list-small">
                            {filteredSizes.map((s, i) => (
                              <div
                                key={i}
                                onMouseDown={() => {
                                  // именно клик по размеру — отправляем вебхук
                                  setSizeInput(s);
                                  setShowSizes(false);
                                  setVidInput("");
                                  fetchSizeAvailability(s);
                                }}
                              >
                                {s}
                              </div>
                            ))}
                          </div>
                        )}

                        {sizeInput && sizeAvailability !== null && (
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 13,
                              color: "#4b5563",
                            }}
                          >
                            {sizeAvailability === 0 ? (
                              "Доступного остатка на складе нет"
                            ) : (
                              <>
                                Доступно на складе:{" "}
                                <span style={{ fontWeight: 600 }}>
                                  {sizeAvailability}
                                </span>{" "}
                                шт.
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      <div
                        className="daily-field"
                        style={{ position: "relative" }}
                      >
                        <label>Вид работы</label>
                        <input
                          type="text"
                          className="daily-input"
                          placeholder="Начните вводить или выберите..."
                          value={vidInput}
                          onChange={(e) => {
                            setVidInput(e.target.value);
                            setShowVids(true);
                          }}
                          onFocus={() => setShowVids(true)}
                          onBlur={() =>
                            setTimeout(() => setShowVids(false), 100)
                          }
                          autoComplete="off"
                          disabled={
                            !sizeInput ||
                            !(bySize[sizeInput] && bySize[sizeInput].length)
                          }
                        />
                        {vidInput && (
                          <button
                            type="button"
                            className="clear-btn"
                            onClick={() => setVidInput("")}
                            tabIndex={-1}
                            aria-label="Очистить поле"
                          >
                            <CrossIcon />
                          </button>
                        )}
                        <button
                          type="button"
                          className="combo-arrow"
                          tabIndex={-1}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setShowVids((v) => !v);
                          }}
                        >
                          ▼
                        </button>
                        {showVids && filteredVids.length > 0 && (
                          <div className="daily-list-small">
                            {filteredVids.map((v, i) => (
                              <div
                                key={i}
                                onMouseDown={() => {
                                  setVidInput(v);
                                  setShowVids(false);
                                }}
                              >
                                {v}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div
                        className="daily-field"
                        style={{ position: "relative" }}
                      >
                        <label>Количество</label>
                        <input
                          type="number"
                          className="daily-input"
                          min="1"
                          value={kolvo}
                          onChange={(e) => setKolvo(e.target.value)}
                        />
                        {kolvo && (
                          <button
                            type="button"
                            className="clear-btn"
                            onClick={() => setKolvo("")}
                            tabIndex={-1}
                            aria-label="Очистить поле"
                          >
                            <CrossIcon />
                          </button>
                        )}
                      </div>

                      {formError && (
                        <div
                          style={{
                            color: "#dc2626",
                            background: "#fee2e2",
                            padding: "6px 12px",
                            borderRadius: 8,
                            fontSize: 15,
                            margin: "8px 0",
                          }}
                        >
                          {formError}
                        </div>
                      )}

                      <div className="daily-flex">
                        <button
                          className="daily-btn-main"
                          onClick={handleSave}
                          disabled={!sizeInput || !vidInput || !kolvo}
                        >
                          Сохранить
                        </button>
                        <button
                          className="daily-btn-alt daily-btn-small"
                          style={{ marginLeft: 8 }}
                          onClick={() => {
                            setIsAdding(false);
                            setEditIndex(null);
                            setKolvo("");
                            setFormError("");
                            setSizeInput("");
                            setVidInput("");
                            setSizeAvailability(null);
                          }}
                        >
                          Завершить редактирование
                        </button>
                      </div>
                    </div>
                  </li>
                )}
              </ul>

              {!isAdding && (
                <div className="daily-flex" style={{ marginTop: 18 }}>
                  <button
                    className="daily-btn-main"
                    onClick={handleAddPosition}
                  >
                    Добавить позицию
                  </button>
                  <button
                    className="daily-btn-alt daily-btn-small"
                    style={{ marginLeft: 8 }}
                    onClick={handleSubmit}
                    disabled={positions.length === 0}
                  >
                    Отправить данные
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
