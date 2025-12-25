# Инструкции за свързване с GitHub

## Стъпка 1: Създайте нов repository в GitHub

1. Отидете на https://github.com/new
2. Въведете име на repository (например: `chat-organizer`)
3. Изберете дали да е публичен или частен
4. **НЕ** маркирайте "Initialize this repository with a README" (тъй като вече имаме git инициализиран)
5. Натиснете "Create repository"

## Стъпка 2: Добавете remote repository

След като създадете repository в GitHub, изпълнете следната команда (заменете `YOUR_USERNAME` и `REPO_NAME` с вашите стойности):

```bash
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
```

Или ако използвате SSH:

```bash
git remote add origin git@github.com:YOUR_USERNAME/REPO_NAME.git
```

## Стъпка 3: Добавете файлове и направете първия commit

```bash
git add .
git commit -m "Initial commit"
```

## Стъпка 4: Изпратете кода в GitHub

```bash
git push -u origin main
```

---

## Алтернативно: Автоматично свързване

Ако искате, мога да ви помогна автоматично да добавите remote, след като ми кажете:
- Вашето GitHub потребителско име
- Името на repository-то

Или ако вече имате създаден repository, просто ми дайте URL-а и ще го добавя за вас.

