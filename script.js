const board = document.getElementById('board');
const addListBtn = document.getElementById('addListBtn');
let draggedCard = null;
let dropIndicator = null;

const state = {
  lists: [
    {
      id: generateId(),
      title: 'Cần làm',
      cards: [
        { id: generateId(), text: 'Lập kế hoạch học tập' },
        { id: generateId(), text: 'Thiết kế giao diện trang web' },
      ],
    },
    {
      id: generateId(),
      title: 'Đang làm',
      cards: [
        { id: generateId(), text: 'Xây dựng layout Trello' },
      ],
    },
    {
      id: generateId(),
      title: 'Hoàn thành',
      cards: [
        { id: generateId(), text: 'Khởi tạo project' },
      ],
    },
  ],
};

function findListById(listId) {
  return state.lists.find((list) => list.id === listId);
}

function findCardById(cardId) {
  for (const list of state.lists) {
    const card = list.cards.find((item) => item.id === cardId);
    if (card) return card;
  }
  return null;
}

function generateId() {
  return `id-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function createInlineForm({ placeholder, value = '', submitText, onSubmit, onCancel }) {
  const form = document.createElement('form');
  form.className = 'inline-form';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'inline-input';
  input.placeholder = placeholder;
  input.value = value;
  input.autofocus = true;

  const actions = document.createElement('div');
  actions.className = 'inline-actions';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.className = 'inline-save';
  saveBtn.textContent = submitText;

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'inline-cancel';
  cancelBtn.textContent = 'Hủy';

  actions.append(saveBtn, cancelBtn);
  form.append(input, actions);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const nextValue = input.value.trim();
    if (!nextValue) {
      input.focus();
      return;
    }
    onSubmit(nextValue);
  });

  cancelBtn.addEventListener('click', () => {
    if (onCancel) onCancel();
  });

  return form;
}

function renderBoard() {
  board.innerHTML = state.lists
    .map(
      (list) => `
        <section class="list" data-list-id="${list.id}">
          <div class="list-header">
            <h3 class="list-title" data-list-id="${list.id}" contenteditable="true" spellcheck="false">${escapeHtml(list.title)}</h3>
            <button class="remove-list" type="button" data-list-id="${list.id}" aria-label="Xóa list">×</button>
          </div>

          <div class="cards" data-list-id="${list.id}">
            ${list.cards
              .map(
                (card) => `
                  <div class="card" draggable="true" data-card-id="${card.id}">
                    <span class="card-text" data-card-id="${card.id}">${escapeHtml(card.text)}</span>
                    <button class="remove-card" type="button" data-card-id="${card.id}" aria-label="Xóa thẻ">×</button>
                  </div>
                `
              )
              .join('')}
          </div>

          <button class="add-card-btn" type="button" data-list-id="${list.id}">+ Thêm thẻ</button>
        </section>
      `
    )
    .join('');

  const addListButton = document.createElement('button');
  addListButton.type = 'button';
  addListButton.className = 'new-list';
  addListButton.textContent = '+ Thêm danh sách';
  board.appendChild(addListButton);
}

function showAddListForm() {
  const addListButton = board.querySelector('.new-list');
  if (!addListButton) return;

  const form = createInlineForm({
    placeholder: 'Tên danh sách',
    submitText: 'Thêm',
    onSubmit: (value) => {
      state.lists.push({
        id: generateId(),
        title: value,
        cards: [],
      });
      renderBoard();
    },
    onCancel: () => {
      renderBoard();
    },
  });

  addListButton.replaceWith(form);
  form.querySelector('input').focus();
}

function showAddCardForm(listId) {
  const listElement = board.querySelector(`.list[data-list-id="${listId}"]`);
  if (!listElement) return;

  const addButton = listElement.querySelector('.add-card-btn');
  if (!addButton) return;

  const form = createInlineForm({
    placeholder: 'Tên thẻ',
    submitText: 'Thêm',
    onSubmit: (value) => {
      const targetList = findListById(listId);
      if (!targetList) return;

      targetList.cards.push({
        id: generateId(),
        text: value,
      });

      renderBoard();
    },
    onCancel: () => {
      renderBoard();
    },
  });

  addButton.replaceWith(form);
  form.querySelector('input').focus();
}

function updateListTitle(listId, value) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return;

  const list = findListById(listId);
  if (!list) return;

  list.title = trimmedValue;
}

function removeCard(cardId) {
  for (const list of state.lists) {
    const cardIndex = list.cards.findIndex((card) => card.id === cardId);
    if (cardIndex !== -1) {
      list.cards.splice(cardIndex, 1);
      renderBoard();
      return;
    }
  }
}

function removeList(listId) {
  state.lists = state.lists.filter((list) => list.id !== listId);
  renderBoard();
}

function getCardInsertionIndex(cardsContainer, mouseY) {
  const cards = [...cardsContainer.querySelectorAll('.card')];

  if (!cards.length) {
    return { index: 0, beforeCard: null };
  }

  for (let i = 0; i < cards.length; i += 1) {
    const card = cards[i];
    const box = card.getBoundingClientRect();
    if (mouseY < box.top + box.height / 2) {
      return { index: i, beforeCard: card };
    }
  }

  return { index: cards.length, beforeCard: null };
}

function updateDropIndicator(cardsContainer, mouseY) {
  const { index, beforeCard } = getCardInsertionIndex(cardsContainer, mouseY);

  if (dropIndicator) {
    dropIndicator.remove();
  }

  const indicator = document.createElement('div');
  indicator.className = 'drop-indicator';

  if (beforeCard) {
    beforeCard.parentNode.insertBefore(indicator, beforeCard);
  } else {
    cardsContainer.appendChild(indicator);
  }

  dropIndicator = indicator;
  return index;
}

function moveCard(cardId, sourceListId, targetListId, targetIndex) {
  const sourceList = state.lists.find((list) => list.id === sourceListId);
  const targetList = state.lists.find((list) => list.id === targetListId);

  if (!sourceList || !targetList) return;

  const sourceIndex = sourceList.cards.findIndex((card) => card.id === cardId);
  if (sourceIndex === -1) return;

  const [card] = sourceList.cards.splice(sourceIndex, 1);

  let insertionIndex = targetIndex;
  if (sourceListId === targetListId && sourceIndex < insertionIndex) {
    insertionIndex -= 1;
  }

  targetList.cards.splice(Math.max(0, insertionIndex), 0, card);
  renderBoard();
}

board.addEventListener('click', (event) => {
  const removeCardBtn = event.target.closest('.remove-card');
  if (removeCardBtn) {
    removeCard(removeCardBtn.dataset.cardId);
    return;
  }

  const removeListBtn = event.target.closest('.remove-list');
  if (removeListBtn) {
    removeList(removeListBtn.dataset.listId);
    return;
  }

  const addCardBtn = event.target.closest('.add-card-btn');
  if (addCardBtn) {
    showAddCardForm(addCardBtn.dataset.listId);
    return;
  }

  const addListTrigger = event.target.closest('.new-list');
  if (addListTrigger) {
    showAddListForm();
  }
});

board.addEventListener('focusout', (event) => {
  const listTitle = event.target.closest('.list-title');
  if (listTitle) {
    updateListTitle(listTitle.dataset.listId, listTitle.textContent);
  }
});

board.addEventListener('dragstart', (event) => {
  const card = event.target.closest('.card');
  if (!card) return;

  draggedCard = {
    id: card.dataset.cardId,
    sourceListId: card.closest('.list').dataset.listId,
  };

  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', draggedCard.id);
});

board.addEventListener('dragover', (event) => {
  const cards = event.target.closest('.cards');
  if (!cards || !draggedCard) return;

  event.preventDefault();
  cards.classList.add('drag-over');
  event.dataTransfer.dropEffect = 'move';

  const targetListId = cards.dataset.listId;
  const targetIndex = updateDropIndicator(cards, event.clientY);
  draggedCard.targetListId = targetListId;
  draggedCard.targetIndex = targetIndex;
});

board.addEventListener('dragleave', (event) => {
  const cards = event.target.closest('.cards');
  if (!cards) return;

  const nextTarget = event.relatedTarget && event.relatedTarget.closest('.cards');
  if (nextTarget !== cards) {
    cards.classList.remove('drag-over');
  }
});

board.addEventListener('drop', (event) => {
  const cards = event.target.closest('.cards');
  if (!cards || !draggedCard) return;

  event.preventDefault();
  cards.classList.remove('drag-over');

  const targetListId = cards.dataset.listId;
  const targetIndex = draggedCard.targetIndex ?? getCardInsertionIndex(cards, event.clientY).index;

  if (targetListId) {
    moveCard(draggedCard.id, draggedCard.sourceListId, targetListId, targetIndex);
  }

  if (dropIndicator) {
    dropIndicator.remove();
    dropIndicator = null;
  }

  draggedCard = null;
});

board.addEventListener('dragend', () => {
  draggedCard = null;
  if (dropIndicator) {
    dropIndicator.remove();
    dropIndicator = null;
  }
  board.querySelectorAll('.cards').forEach((cards) => cards.classList.remove('drag-over'));
});

addListBtn.addEventListener('click', showAddListForm);
renderBoard();
