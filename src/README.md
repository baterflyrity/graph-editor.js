# Graph Editor {{VERSION}}
Данный jQuery плагин позволяет встроить редактор графов на сайт. Функции редактора:
* Добавление, удаление, перемещение узлов и рёбер.
* Изменение стилей/типов узлов и рёбер.
* Редактирование названий и всплывающих подсказок узлов и рёбер.
* Гибкая конфигурация стилей.
* Загрузка, сохранение в файл.
* (Де)сериализация в JSON.
* Программное редактирование графа.

## Начало работы
Создание графа осуществляется в три этапа.
### 1. Зависимости
Для работы плагина предварительно необходимо подключить следующие зависимости:
1. [jQuery 3](https://jquery.com/download/)
2. [Semantic UI 2](https://semantic-ui.com/introduction/getting-started.html#install-nodejs)
3. [Vis.js Network 7](https://visjs.github.io/vis-network/docs/network/)  
4. [Vis.js DataSet 7](https://visjs.github.io/vis-data/data/dataset.html)

    
    <!--jQuery-->     
    <script src="https://code.jquery.com/jquery-3.4.1.min.js" integrity="sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo=" crossorigin="anonymous"></script>
 	
 	<!--Semantic-UI-->
 	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/semantic.min.css" integrity="sha256-9mbkOfVho3ZPXfM7W8sV2SndrGDuh7wuyLjtsWeTI1Q=" crossorigin="anonymous" />
 	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/components/button.min.css" integrity="sha256-xtpiJw1+6DW1Oac4CVyU7PbCxHxufOBIspA9T79Y384=" crossorigin="anonymous" />
 	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/components/dropdown.min.css" integrity="sha256-eKk/OB1/M9wf6oWV2+jUV8DpHXBFjNthcjTRvgPb4jg=" crossorigin="anonymous" />
 	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/components/header.min.css" integrity="sha256-xJCnUW9lBafMfAoQesJSWvpSvudGlOysL8HU3fO/CPI=" crossorigin="anonymous" />
 	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/components/icon.min.css" integrity="sha256-KyXPF3/VOPPst/NQOzCWr97QMfSfzJLyFT0o5lYJXiQ=" crossorigin="anonymous" />
 	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/components/input.min.css" integrity="sha256-hlqxoW9mkPO7jQpdyUy6gqIUIXpFz1iq7NUvYxRoeds=" crossorigin="anonymous" />
 	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/components/item.min.css" integrity="sha256-cruqIcC0V+wSzrSIxWuc5YZylQUm/L18bt6l55+gK5U=" crossorigin="anonymous" />
 	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/components/label.min.css" integrity="sha256-qB3YAR8Frc4C6MnNNmPiJuK0NERKVzSLyvUtOzvHvTc=" crossorigin="anonymous" />
 	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/components/menu.min.css" integrity="sha256-cRSLOaiPiyfTQ4B4HT1OCF/2CWNzGcPO9Nns6Jrf4hg=" crossorigin="anonymous" />
 	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/components/message.min.css" integrity="sha256-DhgaaWn1rmuk1WfOB+BLM7RYn8hQjlnOp0j9LvnJLUs=" crossorigin="anonymous" />
 	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/components/transition.min.css" integrity="sha256-gt0FRuZd5L22CqAruA5Hbx9DXzbJS6xXzK3pEmh+1VE=" crossorigin="anonymous" />
 	<script src="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/semantic.min.js" integrity="sha256-t8GepnyPmw9t+foMh3mKNvcorqNHamSKtKRxxpUEgFI=" crossorigin="anonymous"></script>
 	<script src="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/components/dropdown.min.js" integrity="sha256-uEocYy6a0MpPLLHtYV7QAGdOeMRwE0Am2WtnOg/hBfM=" crossorigin="anonymous"></script>
 	<script src="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/components/modal.min.js" integrity="sha256-8POmd6680Gev+MdgKbVOHP+9lm+9WB1AVyuLf2WRcxc=" crossorigin="anonymous"></script>
 	<script src="https://cdnjs.cloudflare.com/ajax/libs/semantic-ui/2.4.1/components/transition.min.js" integrity="sha256-k30cmb6hiQ/LGKpX2AcllUduUJ0kA4DKKStgUxkGQzM=" crossorigin="anonymous"></script>
 	
 	<!--Vis.js Network-->
 	<link rel="stylesheet" type="text/css" href="vis-network.min.css">
 	<script type="text/javascript" src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>

### 2. Подключение
Сохраните файлы [{{CSS}}]({{CSS}}), [{{JS}}]({{JS}}) и подключите их после зависимостей.

    <!--Graph Editor-->
    <link rel="stylesheet" type="text/css" href="path/to/{{CSS}}">
    <script type="text/javascript" src="path/to/{{JS}}"></script>
    
### 3. Инициализация
Редактор графа необходимо создать из любого контейнера на странице с помощью функции `GraphEditor`.

    <script>
        $(function() { 
            let ge = GraphEditor('#graphContainer');
            //... используем ge ...
        });
    </script>

## Стилизация
Макет редактора графов создаётся внутри контейнера и имеет класс `graph-editor`.

## API
Объект графа содержит несколько полезных функций дял программного управления и взаимодействия.

**GraphEditor (контейнер, стили узлов, стили рёбер, узлы, рёбра) → graph**

Создаёт редактор графов в контейнере с заданными стилями для узлов и рёбер. Также возможно указать исходные данные графа.

* *контейнер* - селектор, или непосредственно DOM элемент, или jQuery-объект, или 'сырая' разметка, или любой другой [валидный](https://api.jquery.com/jquery/#jQuery-elementArray) объект. Если передана коллекция или массив объектов, в качестве контейнера будет использован *только* первый элемент.

    Содержимое контейнера полностью уничтожается, вместо него создаётся макет редактора графов.
    
* *стили узлов* (опционально) - массив типов узлов, структурированный определённым образом. Каждый тип определяет визуальный вид узла.

    Рекомендуется использовать специальный конструктор стилей `GraphEditor.CreateStyles`. Например:
    
        let ge = GraphEditor('body', GraphEditor.CreateStyles(blueNodeType, redNodeType));
        
* *стили рёбер* (опционально) - аналогично стилям узлов.

* *узлы* (опционально) - массив данных узлов, которые будут отображены при создании графа. 

    Является массивом объектов, которые содержат идентификатор `id` узла, его координаты `x`,`y` в редакторе, его тип `type` и другие свойства, присущие данному типу. 
    
    Указанные данные могут не соответствовать стилям графа, поэтому рекомендуется предварительно использовать `graph.serialize()` для их получения. Также существует `graph.deserialize()` для загрузки данных во время работы редактора.

* *рёбра* (опционально) - аналогично узлам.


**GraphEditor.CreateStyles (...тип) → styles**

Структурирует массив типов узлов или рёбер графа определённым образом. Только стили, полученные данным образом, рекомендуется указывать в `GraphEditor`.

* *тип* (можно указать несколько через запятую) - определённым образом структурированный объект, регулирующий визуальный вид узла или ребра. 

    Рекомендуется использовать специальный конструктор типов `GraphEditor.CreateType`. Например:
    
        let nodeStyles = GraphEditor.CreateStyles(blueNodeType, redNodeType);
        
**GraphEditor.CreateType (название, описание, цвет маркера, шаблон отображения) → type**

Создаёт тип визуального отображения узла или ребра графа. Только стили, полученные данным образом, рекомендуется указывать в `GraphEditor.CreateStyles`.

* *название* - название данного типа в меню выбора типов.

* *описание* - описание данного типа в меню выбора типов.

* *цвет маркера* - цвет данного типа в меню выбора типов. Для сокрытия маркера укажите цвет `hidden`.

* *шаблон отображения* - параметры визуального отображения узла или ребра данного типа. 

    Являются объектом, который используются зависимостью Vis.js Network, поэтому подробнее о достпуных свойствах и их значениях можно узнать на странице зависимости для [узлов](https://visjs.github.io/vis-network/docs/network/nodes.html) и [рёбер](https://visjs.github.io/vis-network/docs/network/edges.html).
    
        let blueNodeType = GraphEditor.CreateType('Синий узел', 'Эллипсы синего цвета', 'blue', {
            color: '#8dd0f8',
            shape: 'ellipse'
        });
        let redNodeType = GraphEditor.CreateType('Красный узел', 'Красные узлы без маркера', 'hidden', {
            color: 'red'
        });
        let nodeStyles = GraphEditor.CreateStyles(blueNodeType, redNodeType);
        let ge = GraphEditor('body', nodeStyles);
        

**graph.save ()**

Запускает диалоговое окно сохранения текущих данных графа в файл. Для сохранения в JSON используйте `graph.serialize()`.

**graph.upload ()**

Запускает диалоговое окно загрузки данных графа из файла. Для загрузки из JSON используйте `graph.deserialize()`.

**graph.serialize () → JSON string**

Сохраняет текущие данные графа и сериализует их в строку в формате JSON. Для сохранения в файл используйте `graph.save()`.

**graph.deserialize (JSON string)**

Десериализует *валидную* строку в формате JSON и загружает граф. Для загрузки из файла используйте `graph.upload()`.

**graph.container → jQuery**

Возвращает jQuery-объект контейнера данного графа.

**graph.classes → перечисление классов**

Возвращает перечисление классов графа. В версии {{VERSION}} доступны два класса:
1. node - узлы,
2. edge - рёбра.

Является вспомогательным перечислением для упрощённого доступа к другим свойствам графа.

**graph.types [класс] → styles**

Возвращает массив типов узлов, структурированный определённым образом. Каждый тип определяет визуальный вид узла.

* *класс* - класс из перечисления классов графа `graph.classes`.

Рекомендуется использовать `GraphEditor.CreateStyles` для изменения стилей.

Пример:
    
    let nodeStyles = ge.types[ge.classes.node];


**graph.data [класс] → Vis.js DataSet**

Возвращает данные узлов или рёбер графа. Подробнее о редактировании набора данных [смотрите на странице зависимости](https://visjs.github.io/vis-data/data/dataset.html).

* *класс* - класс из перечисления классов графа `graph.classes`.

**graph.graph → Vis.js Network**

Возвращает 'сырой' объект графа для возможности тонкой настройки и использования API [зависимости](https://visjs.github.io/vis-network/docs/network/).

    let editorMouseXposition = ge.graph.canvas._XconvertCanvasToDOM(mouseXposition);

	
**graph.addNode (id узла = undefined, тип узла = 0 , шаблон узла = {}) → id узла**

Добавить узел. Узел располагается в центре графа или в нулевых координатах. Граф автоматически стабилизируется.


**graph.addEdge (id начального узла, id конечного узла, id ребра = undefined, тип ребра = 0 , шаблон ребра = {}) → id ребра**

Добавить ребро.


**graph.removeNode (id узла) → id узла**

Удалить узел.


**graph.removeEdge (id ребра) → id ребра**

Удалить ребро.


 


