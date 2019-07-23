---
layout: post
title: Перестаньте просто кликать по чекбоксам
---
Возможно этот пост покажется банальным, но есть одна типичная ошибка, 
которую я постоянно вижу, когда вижу разные проекты автоматизации с webdriver: 

Эта проблема - как делать Check/Uncheck для checkbox инпутов.

Представим что есть код (ProtractorJS, но это не принципиально): 

```javascript
describe('test', function () {
    it('test', async function () {
        await browser.get('http://the-internet.herokuapp.com/checkboxes');
        const checkboxes = $$('#checkboxes input[type="checkbox"]')
        await checkboxes.get(0).click()
        await checkboxes.get(1).click()
        expect(await checkboxes.get(0).isSelected()).toBeTruthy('First checkbox expected to be selected')
        expect(await checkboxes.get(1).isSelected()).toBeTruthy('Second checkbox expected to be selected')
    })
})
```

Кажется все ок, но запуская код мы получаем:
```
> protractor ./protractor.conf.js --specs="./examples/checkbox.js"

[18:10:04] I/launcher - Running 1 instances of WebDriver
[18:10:04] I/direct - Using ChromeDriver directly...
Started
F

Failures:
1) test test
  Message:
    Expected false to be truthy 'Second checkbox expected to be selected'.
  Stack:
    Error: Failed expectation
        at UserContext.<anonymous> (/Users/oleksandrkhotemskyi/Documents/GitHub/Protractor_examples/examples/checkbox.js:9:54)
        at <anonymous>
        at process._tickCallback (internal/process/next_tick.js:160:7)
```

Упс, похоже второй чекбокс уже был выбран, а мы его развыбрали.

А если используются PageObjects все становится еще хуже:

```javascript
class Page {
    constructor() {
        this.checkboxes = $$('#checkboxes input[type="checkbox"]')
    }

    async open() {
        await browser.get('http://the-internet.herokuapp.com/checkboxes');
    }

    async selectFirstCheckbox() {
        await this.checkboxes.get(0).click()
    }

    isFirstCheckboxSelected() {
        return this.checkboxes.get(0).isSelected()
    }

    async selectSecondCheckbox() {
        await this.checkboxes.get(1).click()
    }

    isSecondCheckboxSelected() {
        return this.checkboxes.get(1).isSelected()
    }
}

describe('test', function () {
    it('test', async function () {
        const page = new Page()
        await page.open()
        await page.selectFirstCheckbox()
        await page.selectSecondCheckbox()
        expect(await page.isFirstCheckboxSelected()).toBeTruthy('First checkbox expected to be selected')
        expect(await page.isSecondCheckboxSelected()).toBeTruthy('Second checkbox expected to be selected')
    })
})
```

Первое что хочется сделать - проверку чекнут ли уже чекбокс:

```
    async selectFirstCheckbox() {
        if (!(await this.isFirstCheckboxSelected())) {
            await this.checkboxes.get(0).click()
        }
    }
```
В целом это ок, но почему мы вообще пытаемся кликнуть в тестах на чекбокс, если он выбран? Он же выбран не просто так, а из-за нашей бизнес логики. Хорошей идеей будет отмечать это специальным warning сообщением - наши тесты почему то пытались чекнуть уже чекнутый чекбокс:

```
    async selectFirstCheckbox() {
        if (await this.isFirstCheckboxSelected()) {
            console.warn(`Tests are trying to check already checked first checkbox with locator: ${this.checkboxes.get(0).locator()}. No action will be done.`)
        } else {
            await this.checkboxes.get(0).click()
        }
    }
```

Теперь выглядит неплохо, зафиксим и для второго чекбокса:

```
    async selectFirstCheckbox() {
        if (await this.isFirstCheckboxSelected()) {
            console.warn(`Tests are trying to check already checked first checkbox with locator: ${this.checkboxes.get(0).locator()}. No action will be done.`)
        } else {
            await this.checkboxes.get(0).click()
        }
    }

    async selectSecondCheckbox() {
        if (await this.isSecondCheckboxSelected()) {
            console.warn(`Tests are trying to check already checked second checkbox with locator: ${this.checkboxes.get(1).locator()}. No action will be done.`)
        } else {
            await this.checkboxes.get(1).click()
        }
    }
```

На этом можно было бы и закончить. Но мы то знаем что такой код вызовет лютую боль у бойцов с копипастой.

Обычно люди решают это созданием какого то Utils/Helper/Commons модуля, который хранил бы логику как чекнуть чекбокс:

helper.js
```
    async checkCheckbox(checkbox) {
        if (await checkbox.isSelected()) {
            console.warn(`Tests are trying to check already checked checkbox with locator: ${checkbox.locator()}. No action will be done.`)
        } else {
            await checkbox.click()
        }
    }
```

Но это совершенно не ООП подход, в итоге у нас будет килотонны вспомогательных функций на каждый чих, из которых потом будут появлятся новые вспомогательные функции.


Я рекомендую использовать подход с типизированными элементами:

checkbox.js
```
class Checkbox {
    constructor(elemnt) {
        this.element = elemnt
    }

    check() {
        if (await this.isChecked()) {
            console.warn(`Tests are trying to check already checked checkbox with locator: ${this.element.locator()}. No action will be done.`)
        } else {
            await checkbox.click()
        }
    }

    uncheck() {
        if (!(await this.isChecked())) {
            console.warn(`Tests are trying to uncheck already unchecked checkbox with locator: ${this.element.locator()}. No action will be done.`)
        } else {
            await checkbox.click()
        }
    }
    
    isChecked() {
        return this.element.isSelected();
    }

}
```
