import { useMemo, useState } from "react";

function formatPrice(paise) {
  return (paise / 100).toFixed(2);
}

function CustomizationModal({ item, onClose, onConfirm }) {
  const groups = item?.customization_groups || [];

  const [selections, setSelections] = useState(() => {
    const initial = {};
    groups.forEach((group) => {
      initial[group.id] = group.type === "multi" ? [] : null;
    });
    return initial;
  });


  function toggleChoice(group, choiceId) {
    setSelections((prev) => {
      if (group.type === "single") {
        return { ...prev, [group.id]: choiceId };
      }

      const current = prev[group.id] || [];
      const next = current.includes(choiceId)
        ? current.filter((id) => id !== choiceId)
        : [...current, choiceId];

      return { ...prev, [group.id]: next };
    });
  }

  const missingRequired = groups.filter((group) => {
    if (!group.required) return false;
    const selected = selections[group.id];
    return group.type === "multi" ? selected.length === 0 : !selected;
  });

  const deltaPaise = useMemo(() => {
    let total = 0;
    groups.forEach((group) => {
      const selected = selections[group.id];
      const selectedIds =
        group.type === "multi" ? selected : selected ? [selected] : [];

      selectedIds.forEach((choiceId) => {
        const choice = group.choices.find((c) => c.id === choiceId);
        if (choice) total += choice.price_delta_paise || 0;
      });
    });
    return total;
  }, [selections, groups]);

  if (!item) {
    return null;
  }

  const basePricePaise = Math.round(Number(item.price) * 100);
  const unitPricePaise = basePricePaise + deltaPaise;

  function handleConfirm() {
    if (missingRequired.length > 0) return;

    const customizations = groups
      .map((group) => {
        const selected = selections[group.id];
        const selectedIds =
          group.type === "multi" ? selected : selected ? [selected] : [];

        if (selectedIds.length === 0) return null;

        return {
          group_id: group.id,
          group_label: group.label,
          choices: selectedIds.map((choiceId) => {
            const choice = group.choices.find((c) => c.id === choiceId);
            return {
              id: choice.id,
              label: choice.label,
              price_delta_paise: choice.price_delta_paise || 0,
            };
          }),
        };
      })
      .filter(Boolean);

    onConfirm(item, customizations, unitPricePaise);
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-panel">
        <div className="modal-header">
          <h2>{item.name}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <p className="modal-description">{item.description}</p>

        {groups.map((group) => (
          <div className="customization-group" key={group.id}>
            <h3>
              {group.label}
              {group.required && <span className="required-tag"> (required)</span>}
            </h3>

            <div className="customization-choices">
              {group.choices.map((choice) => {
                const selected =
                  group.type === "multi"
                    ? (selections[group.id] || []).includes(choice.id)
                    : selections[group.id] === choice.id;

                return (
                  <button
                    type="button"
                    key={choice.id}
                    className={`choice-pill ${selected ? "choice-pill-selected" : ""}`}
                    onClick={() => toggleChoice(group, choice.id)}
                  >
                    {choice.label}
                    {choice.price_delta_paise > 0 &&
                      ` (+₹${formatPrice(choice.price_delta_paise)})`}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="modal-footer">
          <strong>₹{formatPrice(unitPricePaise)}</strong>

          <button
            type="button"
            className="proceed-button"
            disabled={missingRequired.length > 0}
            onClick={handleConfirm}
          >
            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomizationModal;