function Apidoc(title, main_div_selector, data) {
    var self = this;

    self.types = data.types;
    self.methods = data.methods;
    self.errors = data.errors;
    self.endpoint_url = data.endpoint_url;
    self.type_id = 0;
    self.main_div_selector = main_div_selector;
    self.title = title;

    // build example jsonrpc request for `method_name` and `type` as params
    self.json_rpc_request = function (method_name, type) {
        var output = ""

        output += '{\n';
        output += '    <strong>"jsonrpc"</strong>: "2.0",\n';
        output += '    <strong>"id"</strong>: 1,\n';
        output += '    <strong>"method"</strong>: "' + method_name + '",\n';
        output += '    <strong>"params"</strong>: ' + self.type_example(type, 4) + '\n';
        output += '}'

        return output
    }

    // build example jsonrpc response with `type` as result
    self.json_rpc_response = function (type) {
        var output = ""

        output += '{\n';
        output += '    <strong>"jsonrpc"</strong>: "2.0",\n';
        output += '    <strong>"id"</strong>: 1,\n';
        output += '    <strong>"result"</strong>: ' + self.type_example(type, 4) + '\n';
        output += '}'

        return output
    }

    // format JSON value for <pre> output
    self.display_value = function (value, indent) {
        indent = indent || 0

        var indents = " ".repeat(indent);
        var o = ""

        if (value instanceof Array) {
            o += "[\n";
            self.leach(value, function (key, val, is_last) {
                o += indents + '    ' + self.display_value(val, indent + 4)
                o += is_last ? '\n' : ',\n';
            });
            o += indents + ']';
            return o
        } else if (value instanceof Object) {
            o += "{\n";
            self.leach(value, function (key, val, is_last) {
                o += indents + '    <strong>"' + key + '"</strong>: ' + self.display_value(val, indent + 4)
                o += is_last ? '\n' : ',\n';
            });
            o += indents + '}';
            return o
        } else {
            return self.esc(JSON.stringify(value));
        }
    }

    // htmlescape `value`
    self.esc = function (value) {
        return $("<div>").text(value).html();
    }

    // call `func` with (key, value, is_last) params for each item in `collection`
    self.leach = function (collection, func) {
        var props = [];
        for (var key in collection) {
            if (collection.hasOwnProperty(key)) {
                props.push(key);
            }
        }

        for (var i = 0; i < props.length; i++) {
            func(props[i], collection[props[i]], i === props.length - 1);
        }
    }

    // build type description used for Structure tabs
    self.type_description = function (type_name, indent) {
        indent = indent || 0

        var output = "";
        var indents = " ".repeat(indent);

        // if type_name is array, output all the types in array and separate them with `|`
        if (type_name instanceof Array) {
            for (var i = 0; i < type_name.length; i++) {
                output += self.type_description(type_name[i], indent);
                if (i < type_name.length - 1) {
                    output += ' | ';
                }
            }
            return output;
        }

        // if type_name ends with `[]`, wrap the type description with brackets (it is an array)
        if (type_name.substr(-2) === "[]") {
            output += "[\n";
            type_name = type_name.substr(0, type_name.length - 2);
            output += indents + '    ' + self.type_description(type_name, indent + 4) + '\n';
            output += indents + "]";
        } else {
            if (self.types.hasOwnProperty(type_name)) {
                // if type_name is defined, print a clickable badge and list of properties (for object) or values (for enum)
                var type = self.types[type_name]

                self.type_id++

                output += '<button type="button" class="badge badge-primary btn mr-1" onclick="$(\'#type-' + self.type_id + '\').toggle(0)">' + self.esc(type_name) + "</button>";
                output += '<span id="type-' + self.type_id + '" style="' + ((indent > 0) ? 'display:none' : '') + '">';
                if (type['properties']) {
                    output += "{\n";

                    self.leach(type['properties'], function (property_name, property, is_last) {
                        output += indents + '    <span class="hint">// ' + property['description'] + '</span>\n';
                        output += indents + '    <strong>"' + property_name + '"</strong>: ';
                        output += self.type_description(property['type'], indent + 4)
                        output += (property['optional'] ? ' (optional)' : '')
                        output += (is_last ? '' : ',') + '\n';
                    });

                    output += indents + "}";
                } else if (type['values']) {
                    output += 'one of ' + self.display_value(type['values'], indent);
                }
                output += '</span>'
            } else {
                // if not defined, just print a name
                output += type_name;
            }
        }

        return output;
    }

    // Build json example used for `Example` and `Try it` tabs.
    self.type_example = function (type_name, indent) {
        indent = indent || 0;
        var output = "";
        var indents = " ".repeat(indent);

        // if there is list of types, use example for the first one listed
        if (type_name instanceof Array) {
            type_name = type_name[0]
        }

        // if type was listed as array, put the example value in array
        if (type_name.substr(-2) === "[]") {
            output += "[\n";
            type_name = type_name.substr(0, type_name.length - 2);
            output += indents + '    ' + self.type_example(type_name, indent + 4) + '\n';
            output += indents + "]";
        } else {
            if (self.types.hasOwnProperty(type_name)) {
                var type = self.types[type_name]

                if (type['properties']) {
                    // if type has properties, list example for each property
                    output += "{\n";

                    self.leach(type['properties'], function (property_name, property, is_last) {
                        output += indents + '    <span title="' + self.esc(property['description']) + '"><strong>"' + property_name + '"</strong>: ';
                        if (property.hasOwnProperty('example')) {
                            output += self.display_value(property['example'], indent + 4) + (is_last ? '' : ',') + "\n";
                        } else {
                            output += self.type_example(property['type'], indent + 4) + (is_last ? '' : ',') + "\n";
                        }
                    });

                    output += indents + "}";

                } else if (type['values']) {
                    // use first value of enum as example if no example was given
                    output += self.display_value(type['values'][0], indent);
                }
            } else {
                // print type name if no example can be found
                output += type_name;
            }
        }

        return output;
    }

    // Make error examples for Errors tab.
    self.error_descriptions = function (error_names) {
        var output = ""

        $.each(error_names, function (i, error_name) {
            var error = self.errors[error_name];

            if (error.hasOwnProperty('description')) {
                output += '<span class="hint">// ' + self.esc(error['description']) + '</span>\n';
            }
            output += self.display_value({
                'jsonrpc': "2.0",
                "id": 1,
                "error": {
                    'message': error['message'],
                    'code': error['code']
                }
            }, 0)
            output += '\n';
        })

        return output
    }

    // builds form for sending `json` to endpoint
    self.try_form = function (method_id, json) {
        var $form = $('<form id="form-' + method_id + '">' +
            '<div class="form-group"><label for="exampleFormControlTextarea1">Request body:</label>' +
            '<textarea class="form-control" id="exampleFormControlTextarea1" rows="10"></textarea></div>' +
            '<button type="submit" class="btn btn-primary">Send</button>' +
            '</form>')

        var $textarea = $form.find('textarea').val(json)

        $form.submit(function () {
            var $response_pre = $('#response-' + method_id + '-try pre');
            $response_pre.text('Loading...');
            $('#response-' + method_id + ' .try').attr('hidden', false).find('a').click();

            $.ajax({
                url: $('#endpoint_url').attr('value'),
                type: "POST",
                data: $textarea.val(),
                contentType: "application/json",
                success: function (response) {
                    $response_pre.html(self.display_value(response, 0));
                },
                error: function (xhr, status) {
                    $response_pre.text(status);
                }
            });

            return false;
        })

        return $form
    }

    // make div for request section of `method_name`
    self.request = function (method_name, method_id, type_name) {
        var $div = $('<div class="mb-3">')
        $div.append("<h2>Request</h2>")
        $div.append(
            $('<ul class="nav nav-pills mb-3">')
                .append($('<li class="nav-item"><a class="nav-link active" data-toggle="pill" href="#request-' + method_id + '-structure">Structure</a></li>'))
                .append($('<li class="nav-item"><a class="nav-link" data-toggle="pill" href="#request-' + method_id + '-example">Example</a></li>'))
                .append($('<li class="nav-item"><a class="nav-link" data-toggle="pill" href="#request-' + method_id + '-try">Try it</a></li>'))
        );

        var $req_pre = $('<pre>').html(self.json_rpc_request(method_name, type_name));
        $div.append(
            $('<div class="tab-content card">')
                .append($('<div class="card-body tab-pane fade show active" id="request-' + method_id + '-structure">').append($('<pre>').html(self.type_description(type_name, 0))))
                .append($('<div class="card-body tab-pane fade" id="request-' + method_id + '-example">').append($req_pre))
                .append($('<div class="card-body tab-pane fade" id="request-' + method_id + '-try">').append(self.try_form(method_id, $req_pre.text())))
        );

        return $div;
    }

    // make div for response section with result of `type_name`
    self.response = function (method_id, type_name, error_names) {
        var $div = $('<div class="mb-3" id="response-' + method_id + '">')
        $div.append("<h2>Response</h2>")
        $div.append(
            $('<ul class="nav nav-pills mb-3">')
                .append($('<li class="nav-item"><a class="nav-link active" data-toggle="pill" href="#response-' + method_id + '-structure">Structure</a></li>'))
                .append($('<li class="nav-item"><a class="nav-link" data-toggle="pill" href="#response-' + method_id + '-example">Example</a></li>'))
                .append(error_names ? $('<li class="nav-item"><a class="nav-link" data-toggle="pill" href="#response-' + method_id + '-errors">Errors</a></li>') : [])
                .append($('<li class="nav-item try" hidden><a class="nav-link" data-toggle="pill" href="#response-' + method_id + '-try">Real response</a></li>'))
        );
        $div.append(
            $('<div class="tab-content card">')
                .append($('<div class="card-body tab-pane fade show active" id="response-' + method_id + '-structure">').append($('<pre>').html(self.type_description(type_name))))
                .append($('<div class="card-body tab-pane fade" id="response-' + method_id + '-example">').append($('<pre>').html(self.json_rpc_response(type_name))))
                .append($('<div class="card-body tab-pane fade" id="response-' + method_id + '-errors">').append($('<pre>').html(self.error_descriptions(error_names))))
                .append($('<div class="card-body tab-pane fade" id="response-' + method_id + '-try">').append($('<pre>')))
        );

        return $div
    }

    // process type inheritance
    do {
        var changed = false

        $.each(self.types, function (name, type) {
            if (type.hasOwnProperty('extends')) {
                var properties = {}
                if (self.types[type['extends']].hasOwnProperty('extends')) {
                    return;
                }
                $.each(self.types[type['extends']]['properties'], function (key, val) {
                    properties[key] = val;
                });
                $.each(type['properties'], function (key, val) {
                    properties[key] = val;
                });
                type['properties'] = properties;
                delete type['extends'];
                changed = true
            }
        })
    } while (changed);

    // Make the DOM dance
    $(document).ready(function () {
        var $main = $(self.main_div_selector);

        $main.append(
            $('<nav class="navbar sticky-top navbar-dark bg-dark">')
                .append($('<a class="navbar-brand" href="#">').text(self.title))
        );

        $main.append($(
            '<div class="card mb-3 p-3">' +
            '    <form class="mb-0">' +
            '        <div class="form-group row">' +
            '            <label for="endpoint_url" class="col-sm-2 col-form-label">Endpoint URL:</label>' +
            '            <div class="col-sm-10">' +
            '                <input type="text" class="form-control" id="endpoint_url" placeholder="http://...">' +
            '            </div>' +
            '        </div>' +
            '    </form>' +
            '</div>'
        ))

        $main.find('#enpoint_url').attr('value', self.endpoint_url);

        $.each(self.methods, function (name, method) {
            var method_id = name.replace('.', '-')
            $main.append(
                $('<div class="card mb-3">')
                    .append(
                        $('<div class="card-header">')
                            .append($('<h1>').append($('<a data-toggle="collapse" href="#method-' + method_id + '">').text(name)))
                            .append($('<p>').text(method['description']))
                    )
                    .append(
                        $('<div class="card-body collapse" id="method-' + method_id + '">')
                            .append(self.request(name, method_id, method['params']))
                            .append(self.response(method_id, method['result'], method['errors']))
                    )
            )
        })
    });
}
