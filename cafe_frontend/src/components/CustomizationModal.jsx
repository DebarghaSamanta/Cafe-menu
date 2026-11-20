import { useMemo, useState } from "react";
import { X, Plus, Check } from "lucide-react";
import "./CustomizationModal.css";

function formatPrice(paise) {
  return (paise / 100).toFixed(2);
}

function CustomizationModal({ item, onClose, onConfirm }) {
  const groups = item?.customization_groups || [];

  // Initialize selections with intelligent defaults for required single-choice groups
  const [selections, setSelections] = useState(() => {
    const initial = {};
    groups.forEach((group) => {
      if (group.type === "single") {
        // Auto-select first choice if required or available
        initial[group.id] = group.choices?.[0]?.id || null;
      } else {
        initial[group.id] = [];
      }
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
    return group.type === "multi" ? (!selected || selected.length === 0) : !selected;
  });

  const deltaPaise = useMemo(() => {
    let total = 0;
    groups.forEach((group) => {
      const selected = selections[group.id];
      const selectedIds =
        group.type === "multi" ? (selected || []) : (selected ? [selected] : []);

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
          group.type === "multi" ? (selected || []) : (selected ? [selected] : []);

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
    <div className="cm-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="cm-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cm-header">
          <div className="cm-header-text">
            {item.category && (
              <span className="cm-category-badge">{item.category}</span>
            )}
            <h2 className="cm-title">{item.name}</h2>
            {item.description && (
              <p className="cm-desc">{item.description}</p>
            )}
          </div>
          <button
            type="button"
            className="cm-close-btn"
            onClick={onClose}
            aria-label="Close customization modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Customization Options Body */}
        <div className="cm-body">
          {groups.map((group) => (
            <div className="cm-group" key={group.id}>
              <div className="cm-group-header">
                <h3 className="cm-group-title">{group.label}</h3>
                {group.required ? (
                  <span className="cm-required-tag">Required</span>
                ) : (
                  <span className="cm-optional-tag">Optional</span>
                )}
              </div>

              <div className="cm-choices">
                {group.choices.map((choice) => {
                  const selected =
                    group.type === "multi"
                      ? (selections[group.id] || []).includes(choice.id)
                      : selections[group.id] === choice.id;

                  return (
                    <button
                      type="button"
                      key={choice.id}
                      className={`cm-choice-btn ${selected ? "selected" : ""}`}
                      onClick={() => toggleChoice(group, choice.id)}
                    >
                      {selected && <Check size={13} strokeWidth={2.5} />}
                      <span>{choice.label}</span>
                      {choice.price_delta_paise > 0 && (
                        <span className="cm-choice-delta">
                          (+₹{formatPrice(choice.price_delta_paise)})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="cm-footer">
          <div className="cm-price-block">
            <span className="cm-price-label">Customized Price</span>
            <span className="cm-price-val">₹{formatPrice(unitPricePaise)}</span>
          </div>

          <button
            type="button"
            className="cm-add-btn"
            disabled={missingRequired.length > 0}
            onClick={handleConfirm}
          >
            <Plus size={15} strokeWidth={2.2} />
            <span>Add to Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomizationModal;