# Graph Editor 1.1

## Классы свойств select

### Опции

- Полная подробная форма:

        options = {
            value: {
                content: {
                    long: "Отображаемый в списке текст/html",
                    short: "Отображаемый при выборе текст/html"
                },
                group: "Группа"
            }
        }
 

- Полная форма:

        options = {
            value: {
                content: "Отображаемый везде текст/html",
                group: "Группа"
            }
        }
    
- Неполная форма (автоматическое назначение группы `"default"`):

        options = {
            value: "Отображаемый везде текст/html"
        }
        
- Сокращённая форма (автоматическое назначение `value=<индекс>`, затем преобразование в неполную форму):

        options = [
            "Отображаемый везде текст/html"
        ]
        

---

#### Встроенные объекты

Element classes:
- node
- edge

Element types:
- defaultNode
- defaultEdge
- titledNode
- customTitledNode

Element styles:
- defaultNode
- defaultEdge
- greenNode
- redNode

Element properties:
- label
- hiddenLabel
- title
- customTitle

Property classes:
- text
- select
- optionalSelect
- multiSelect
- customSelect
- customOptionalSelect
- customMultiSelect
- hidden
- hiddenLabel


