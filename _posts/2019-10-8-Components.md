---
layout: post
title: Pattern Component (на примере Checkbox)
---
Возможно, этот пост покажется банальным, но есть одна типичная ошибка, 
которую я постоянно замечаю, когда работаю с различными проектами автоматизации на webdriver: "Как делать Check/Uncheck для checkbox инпутов?"

Представим, что есть код (ProtractorJS, но это не принципиально): 

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

Кажется, все ок, но, запуская код, мы получаем:
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

Упс, похоже, второй чекбокс уже был выбран, а мы его развыбрали.

А если используются PageObjects, все становится еще хуже:

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

Первое, что хочется сделать - проверку, чекнут ли уже чекбокс:

```javascript
    async selectFirstCheckbox() {
        if (!(await this.isFirstCheckboxSelected())) {
            await this.checkboxes.get(0).click()
        }
    }
```
В целом, это ок, но почему мы вообще пытаемся кликнуть в тестах на чекбокс, если он выбран? Он же выбран не просто так, а из-за нашей бизнес логики. Хорошей идеей будет отмечать это специальным warning сообщением - наши тесты почему-то пытались чекнуть уже чекнутый чекбокс:

```javascript
    async selectFirstCheckbox() {
        if (await this.isFirstCheckboxSelected()) {
            console.warn(`Tests are trying to check already checked first checkbox with locator: ${this.checkboxes.get(0).locator()}. No action will be done.`)
        } else {
            await this.checkboxes.get(0).click()
        }
    }
```

Теперь выглядит неплохо, зафиксим и для второго чекбокса:

```javascript
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

На этом можно было бы и закончить. Но мы-то знаем, что такой код вызовет лютую боль у бойцов с копипастой.

Обычно люди решают это созданием какого-то Utils/Helper/Commons модуля, который хранил бы логику как чекнуть чекбокс:

helper.js
```javascript
    async checkCheckbox(checkbox) {
        if (await checkbox.isSelected()) {
            console.warn(`Tests are trying to check already checked checkbox with locator: ${checkbox.locator()}. No action will be done.`)
        } else {
            await checkbox.click()
        }
    }
```

Но это совершенно не ООП подход, в итоге у нас будет килотонны вспомогательных функций на каждый чих. Это не масштабируемо, не дает нужной инкапсуляции, и чревато ошибками если передан неправильный элемент.


Я рекомендую использовать подход с типизированными элементами. Я предпочитаю называть это Component. В целом этот паттерн не новый, и гуляет по интернету под различными названиями - HTML element, fragment, component, Element...

Как это может выглядеть:

checkbox.js
```javascript
class Checkbox {
    constructor(elemnt) {
        this.element = elemnt
    }

    async check() {
        if (await this.isChecked()) {
            console.warn(`Tests are trying to check already checked checkbox with locator: ${this.element.locator()}. No action will be done.`)
        } else {
            await this.element.click()
        }
    }

    async uncheck() {
        if (!(await this.isChecked())) {
            console.warn(`Tests are trying to uncheck already unchecked checkbox with locator: ${this.element.locator()}. No action will be done.`)
        } else {
            await this.element.click()
        }
    }
    
    isChecked() {
        return this.element.isSelected();
    }

}
```

Мы получаем четкий объект, который работает как враппер над нашим чекбоксом, можем использовать его, напрямую вызывая из pageobject:

```javascript
class Page {
    constructor() {
        this.checkboxes = $$('#checkboxes input[type="checkbox"]')
        this.firstCheckbox = new Checkbox(this.checkboxes.get(0))
        this.secondCheckbox = new Checkbox(this.checkboxes.get(1))
    }

    async open() {
        await browser.get('http://the-internet.herokuapp.com/checkboxes');
    }
}

describe('test', function () {
    it('test', async function () {
        const page = new Page()
        await page.open()
        await page.firstCheckbox.check()
        await page.secondCheckbox.check()
        expect(await page.firstCheckbox.isChecked()).toBeTruthy('First checkbox expected to be selected')
        expect(await page.secondCheckbox.isChecked()).toBeTruthy('Second checkbox expected to be selected')
    })
})
```

В целом это рабочий вариант и имеет право на жизнь. Но это может нарушить инкапсуляцию и раскрыть содержимое страницы в тест. Можно обернуть это в методы в самом pageobject:
```javascript
class Page {
    constructor() {
        this.checkboxes = $$('#checkboxes input[type="checkbox"]')
        this.firstCheckbox = new Checkbox(this.checkboxes.get(0))
        this.secondCheckbox = new Checkbox(this.checkboxes.get(1))
    }

    async open() {
        await browser.get('http://the-internet.herokuapp.com/checkboxes');
    }

    async selectFirstCheckbox() {
        await this.firstCheckbox.check()
    }

    isFirstCheckboxSelected() {
        return this.firstCheckbox.isChecked()
    }

    async selectSecondCheckbox() {
        await this.secondCheckbox.check()
    }

    isSecondCheckboxSelected() {
        return this.secondCheckbox.isChecked()
    }
}
```

Но это может быть избыточно, и добавляет некоторое дублирование в код. К тому же мы слегка откатываемся к начальной версии без Checkbox компонента. Рекомендую действовать по обстоятельствам в каждом конкретном проекте или даже случае. 


Можем развить идею еще дальше. Почему бы нам не использовать наследование тут, и сделать наш Checkbox, чтобы он фактически являлся WebElement (ElementFinder в ProtractorJS). Когда-то давно я уже проводил [доклад](https://youtu.be/aSmTwARoPJA)  на эту тему, и даже презентовал свою вспомогательную [библиотеку](https://github.com/Xotabu4/protractor-element-extend/blob/master/README.md) для этого. Давайте посмотрим как мы можем провернуть это в ProtractorJS, и что это нам даст:


```javascript
import {BaseFragment} from 'protractor-element-extend'

class Checkbox extends BaseFragment {
    async check() {
        if (await this.isChecked()) {
            console.warn(`Tests are trying to check already checked checkbox with locator: ${this.locator()}. No action will be done.`)
        } else {
            await this.click()
        }
    }

    async uncheck() {
        if (!(await this.isChecked())) {
            console.warn(`Tests are trying to uncheck already unchecked checkbox with locator: ${this.locator()}. No action will be done.`)
        } else {
            await this.click()
        }
    }
    
    isChecked() {
        return this.isSelected();
    }

}
```

1) Обратите внимание, что мы теперь наследуем Checkbox от BaseFragment.

2) BaseFragment принимает в своем конструкторе протракторовский - ElementFinder, и это дает нам возможность избавиться от конструктора в Checkbox (будет использоваться унаследованный от BaseFragment конструктор):
```javascript
    // больше не нужно
    constructor(elemnt) {
        this.element = elemnt
    }
```

3) Но самая мякотка в том, что наш `this` внутри checkbox теперь является валидным ElementFinder, который мы передали в конструктор, поскольку мы унаследовались от него. Теперь `this.click()` внутри Checkbox вызовет `click` на том элементе который был передан в конструктор параметром. 

Наследование от ElementFinder дает возможность использовать некоторые интересные трюки. К примеру - наши чекбоксы появляются с небольшой задержкой, и нам нужно ожидание видимости чекбокса:

```javascript
import {BaseFragment} from 'protractor-element-extend'

class Checkbox extends BaseFragment {
    async check() {
        if (await this.isChecked()) {
            console.warn(`Tests are trying to check already checked checkbox with locator: ${this.locator()}. No action will be done.`)
        } else {
            await browser.wait(EC.visibilityOf(this), 10000, `Checkbox with locator: ${this.locator()} is not visible`)
            await this.click()
        }
    }

    async uncheck() {
        if (!(await this.isChecked())) {
            console.warn(`Tests are trying to uncheck already unchecked checkbox with locator: ${this.locator()}. No action will be done.`)
        } else {
            await browser.wait(EC.visibilityOf(this), 10000, `Checkbox with locator: ${this.locator()} is not visible`)
            await this.click()
        }
    }
    
    async isChecked() {
        await browser.wait(EC.visibilityOf(this), 10000, `Checkbox with locator: ${this.locator()} is not visible`)
        return this.isSelected();
    }

}
```

Поскольку наш Checkbox совместим с ElementFinder, мы можем передавать `this` прямо в ExpectedConditions.visibilityOf, что довольно удобно. Кому интересно детальней про .wait - недавно у меня был [доклад в котором мы рассматривали как работают ожидания](https://youtu.be/wvTJz5VyRJc). 

Конечно это работает и снаружи:

```javascript
const checkboxes = $$('#checkboxes input[type="checkbox"]')
const firstCheckbox = new Checkbox(this.checkboxes.get(0))

await browser.wait(EC.visibilityOf(firstCheckbox), 10000, `Checkbox with locator: ${firstCheckbox.locator()} is not visible`)
```

Наш PageObject менять не нужно, интерфейс для работы с Checkbox остается таким же.
