"use strict";

(function() {
    function viewportWatchContainer() {
        viewportWatchContainerCtrl.$inject = ["$element"];
        return {
            restrict: "A",
            bindToController: true,
            controller: viewportWatchContainerCtrl
        }

        function viewportWatchContainerCtrl($element) {
            this.getElement = getElement;
            function getElement() {
                return $element;
            }
        }
    }

    viewportWatch.$inject = [ "scrollMonitor", "$timeout" ];
    function viewportWatch(scrollMonitor, $timeout) {
        var viewportUpdateTimeout;
        function debouncedViewportUpdate() {
            $timeout.cancel(viewportUpdateTimeout);
            viewportUpdateTimeout = $timeout(function() {
                scrollMonitor.update();
            }, 10);
        }
        return {
            restrict: "AE",
            require: '^^?viewportWatchContainer',
            link: function(scope, element, attr, controller) {
                var container = controller ? controller.getElement() : null;
                var containerMonitor = container ? scrollMonitor.createContainer(container) : null;
                var elementWatcher = (containerMonitor || scrollMonitor).create(element, scope.$eval(attr.viewportWatch || "0"));
                function watchDuringDisable() {
                    this.$$watchersBackup = this.$$watchersBackup || [];
                    this.$$watchers = this.$$watchersBackup;
                    var unwatch = this.constructor.prototype.$watch.apply(this, arguments);
                    this.$$watchers = null;
                    return unwatch;
                }
                function toggleWatchers(scope, enable) {
                    var digest, current, next = scope;
                    do {
                        current = next;
                        if (enable) {
                            if (current.hasOwnProperty("$$watchersBackup")) {
                                current.$$watchers = current.$$watchersBackup;
                                delete current.$$watchersBackup;
                                delete current.$watch;
                                digest = !scope.$root.$$phase;
                            }
                        } else {
                            if (!current.hasOwnProperty("$$watchersBackup")) {
                                current.$$watchersBackup = current.$$watchers;
                                current.$$watchers = null;
                                current.$watch = watchDuringDisable;
                            }
                        }
                        next = current.$$childHead;
                        while (!next && current !== scope) {
                            if (current.$$nextSibling) {
                                next = current.$$nextSibling;
                            } else {
                                current = current.$parent;
                            }
                        }
                    } while (next);
                    if (digest) {
                        scope.$digest();
                    }
                }
                function disableDigest() {
                    toggleWatchers(scope, false);
                }
                function enableDigest() {
                    toggleWatchers(scope, true);
                }
                if (!elementWatcher.isInViewport) {
                    scope.$evalAsync(disableDigest);
                    debouncedViewportUpdate();
                }
                elementWatcher.enterViewport(enableDigest);
                elementWatcher.exitViewport(disableDigest);
                scope.$on("toggleWatchers", function(event, enable) {
                    toggleWatchers(scope, enable);
                });
                scope.$on("$destroy", function() {
                    elementWatcher.destroy();
                    debouncedViewportUpdate();
                });
            }
        };
    }
    angular.module("angularViewportWatch", [])
        .directive("viewportWatch", viewportWatch)
        .directive("viewportWatchContainer", viewportWatchContainer)
        .value("scrollMonitor", window.scrollMonitor);
})();
