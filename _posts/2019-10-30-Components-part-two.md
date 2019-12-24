---
layout: post
title: Own Components Collection
---

В [предыдущей статье](/Components) мы рассмотрели как можно создавать свои типы элементов, сохраняя полную обратную совместимость с WebElement на примере ProtractorJS. 

Но один элемент это хорошо, но иногда возникает необходимость работать с множеством элементов. Это может быть коллекция однотипных элементов. Давайте для наглядности возьмем примером результаты поиска:

[Сама страница](https://demo.litecart.net/search?query=duck)


![Ducks Store](/images/posts/Components-part-two/1.png)


Что мы видим здесь? Сама страница результатов довольно типична для интернет магазинов, есть поиск, сортировки, и собственно сами результаты поиска.


Легко заметить, что все карточки продуктов имеют практически идентичную структуру DOM (небольшие различия в NEW/DISCOUNTED продуктах):


![Ducks Store](/images/posts/Components-part-two/2.png)


Давайте взглянем поближе на один продукт в результатах:

```html
<article class="product-column">
  <a class="link" href="https://demo.litecart.net/someUrl" title="Yellow Duck" data-id="1" data-sku="RD001" data-name="Yellow Duck" data-price="18.00">

    <div class="image-wrapper">
      <img class="image img-responsive" src="https://demo.litecart.net/some.jpg" alt="Yellow Duck">
      <div class="sticker sale" title="On Sale">Sale</div>    </div>

    <div class="info">
      <div class="name">Yellow Duck</div>
      <div class="manufacturer-name">ACME Corp.</div>
      <div class="price-wrapper">
                <del class="regular-price">$20</del> <strong class="campaign-price">$18</strong>
              </div>
    </div>
  </a>

  <button class="preview btn btn-default btn-sm" data-toggle="lightbox" data-target="https://demo.litecart.net/someUrl" data-require-window-width="768" data-max-width="980">
    <i class="fa fa-search-plus"></i>  </button>
</article>
```


С помощью паттерна Component мы опишем Product, который будет описывать одну карточку продукта на этой странице. Компонент начинается с тега `article` (Здесь и дальше примеры кода на TypeScript+ProtractorJS+protractor-element-extend):

```typescript
import { BaseFragment } from 'protractor-element-extend'

class Product extends BaseFragment {

}
```

Верстка слегка отличается между продуктом без скидки, и со скидкой. Блок цены для продукта со скидкой:

```html
<div class="price-wrapper">
    <del class="regular-price">$20</del> 
    <strong class="campaign-price">$18</strong>
</div>
```

Такой же продукт без скидки:

```html
<div class="price-wrapper">
    <span class="price">$20</span>
</div>
```

Какие я вижу варианты чтобы цену можно было взять для всех версий? 

- Вариант 1: Использовать css selector вида - `.price-wrapper .campaign-price,.price`.
Запятая в селекторе в этом случае означает ИЛИ. Соответственно будет выбран или элемент с классом `campaign-price` или `price` - смотря что будет внутри `.price-wrapper`

- Вариант 2: Взять цену из атрибута. Если мы посмотрим ближе на контейнер-ссылку в котором находится вся карточка, мы заметим что там есть атрибут `data-price`:

```html
<a class="link" href="https://demo.litecart.net/someLink" title="Yellow Duck" data-id="1" data-sku="RD001" data-name="Yellow Duck" data-price="18.00">
```

Он символизирует собой цену после применения всех скидок (если они есть).

Тут можно выбирать варианты (возможно найти еще способы). Я хочу использовать первый вариант, чтобы работать с той ценой которую пользователь реально видит в приложении.

Давайте реализуем эту функцию и парочку других для работы данными компонента:

```typescript
import { BaseFragment } from 'protractor-element-extend'

class Product extends BaseFragment {
    public async price(): Promise<number> {
        const price: string = await this.$('.price-wrapper .campaign-price,.price').getText()
        return this.parsePrice(price)
    }

    public async regularPrice(): Promise<number> {
        const price: string = await this.$('.price-wrapper .regular-price').getText()
        return this.parsePrice(price)
    }

    /**
     * Возвращаем true, если особый .sale стикер существует в этом компоненте
     */
    public async isDiscounted(): Promise<boolean> {
        return this.$('.sticker.sale').isPresent()
    }

    public async name(): Promise<string> {
        return this.$('.info .name').getText()
    }

    public async manufacturer(): Promise<string> {
        return this.$('.info .manufacturer-name').getText()
    }


    public async open(): Promise<void> {
        await this.click()
    }

    private parsePrice(price: string): Promise<number> {
        // Потенциально небезопасный кусок если мы переключим сайт на другую валюту. Но пока не будем усложнять
        price = price.replace('$', '')
        // Используем parseFloat потому что цена может быть с копейками
        return parseFloat(price)
    }
}
```

Мы описали не все, но достаточно для нашего примера. Давайте теперь перейдем к описанию коллекции результатов. В библиотеке `protractor-element-extend` существуют заготовки которые позволяют объявлять свои компоненты, но и также существует возможность наследоватся от коллекции элементов (ElementArrayFinder в protractor). Этот объект будет не потомком стандартного Array, но довольно похожим. Особенность в том что наша унаследованная коллекция элементов будет содержать в себе не сырые ElementFinder, а наши компоненты.

Объявить свою коллекцию элементов и указать какой тип будет у каждого элемента очень просто:

```typescript
import { BaseArrayFragment } from 'protractor-element-extend'

class SearchResults extends BaseArrayFragment<Product> {
    constructor() {
        super($$('#box-search-results article'), Product)
    }
}
```

Сначала посмотрим на наследование от `BaseArrayFragment<Product>`. Мы используем [Generics](https://www.typescriptlang.org/docs/handbook/generics.html) чтобы получить подсказки, и проверки типов на этапе компиляции. Это дополнительная, но очень удобная фича, которая будет знакома тем кто пишет на строго типизированных языках типа Java или C#.

Теперь внимательней посмотрим на функцию-конструктор:

```typescript
    constructor() {
        super($$('#box-search-results article'), Product)
    }
```

`super($$('#box-search-results article')` - если вы наследуетесь от BaseArrayFragment, то первым параметром нужно передать вашу коллекцию элементов которую вы хотите унаследовать. И вторым параметром - class который определяет тип каждого элемента в коллекции.

В результате, наш SearchResults будет наследником [ElementArrayFinder](http://www.protractortest.org/#/api?view=ElementArrayFinder) и все функции которые доступны у него, доступны и у SearchResults. А также парочку дополнительных функций, которых почему-то нет у ElementArrayFinder. Это `.find()`, `.some()` и `.every()`, спасибо [@voropa](https://github.com/voropa) за помощь!

Добавление в Page Object довольно простое:

```typescript
class SearchResultsPage {
    searchResults: SearchResults = new SearchResults()
}
```

Что нам это дает? Зачем все эти приседания?

На самом деле довольно многое. Давайте по порядку.

Мы получаем очень мощную возможность фильтрации и работы с нашими Product компонентами.
К примеру мы хотим выбрать первый результат со скидкой:

```typescript

const resultsPage = new SearchResultsPage()

// Обратите внимание что firstDiscounted остается Lazy, поиск на странице не произойдет пока мы не начнем работать с ним
const firstDiscounted = resultsPage.searchResults
    // Метод filter, теперь итерируется не по ElementFinder объектам, а по нашим Product компонентам
    .filter(result => result.isDiscounted())
    .first()
// Или аналогично используя .find()
const firstDiscounted = resultsPage.searchResults.find(result => result.isDiscounted())

await firstDiscounted.open()

```

Пример выше можно даже улучшить, если добавить небольшой getter в SearchResults class:

```typescript
import { BaseArrayFragment } from 'protractor-element-extend'

class SearchResults extends BaseArrayFragment<Product> {
    get discounted(): SearchResults {
        return this.filter(result => result.isDiscounted())
    }

    constructor() {
        super($$('#box-search-results article'), Product)
    }
}
```

Теперь в тестах будет еще круче:

```typescript
await resultsPage.searchResults.discounted.first().open()
```

Можно получать что-то из коллекции, просто добавляя методы которые будут работать как нам нужно:

```typescript
import { BaseArrayFragment } from 'protractor-element-extend'

class SearchResults extends BaseArrayFragment<Product> {
    get discounted(): SearchResults {
        return this.filter(result => result.isDiscounted())
    }

    constructor() {
        super($$('#box-search-results article'), Product)
    }

    getByProductName(neededName: string): Product {
        return this.find(async product => {
            const productName = await product.name()
            return productName.includes(neededName)
        })
    }
}
```

В тестах:

```typescript
const yellowDuck = resultsPage.searchResults.getByProductName('Yellow Duck')
console.log(`Yellow duck has price:`, await yellowDuck.price())
console.log(`Yellow duck has manufacturer:`, await yellowDuck.manufacturer())
```

Можно легко и быстро собирать всю информацю по всех товарах, если добавить метод в Product, который будет ее предоставлять:

```typescript
class Product extends BaseFragment {
    // ... rest of the code
    getProductDetails(): Promise<ProductDetails> {
        return {
            name: await this.name(),
            manufacturer: await this.manufacturer(),
            price: await this.price(),
            regularPrice: await this.regularPrice(),
            isDiscounted: await this.isDiscounted()
        }
    }
}

interface ProductDetails {
    name: string
    manufacturer: string
    price: number
    regularPrice: number
    isDiscounted: boolean
}
```