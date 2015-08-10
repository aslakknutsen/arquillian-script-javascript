/**
 * 
 */
load("shrinkwrap.js")

arquillian = function() {

	ShrinkWrap.resolve({
		deps: [
	            "org.jboss.arquillian.core:arquillian-core-impl-base:1.1.8.Final",
	            "org.jboss.arquillian.container:arquillian-container-spi:1.1.8.Final",
	            "org.jboss.arquillian.container:arquillian-container-impl-base:1.1.8.Final",
	            "org.arquillian.container:arquillian-container-chameleon:1.0.0.Alpha4"
        ],
        classes: [
				"org.jboss.shrinkwrap.api.spec.WebArchive",
				"org.jboss.shrinkwrap.api.ShrinkWrap",
				"org.jboss.arquillian.config.descriptor.api.ArquillianDescriptor",
				"org.jboss.arquillian.core.spi.ManagerBuilder",
				"org.jboss.arquillian.core.spi.ServiceLoader",
				"org.jboss.arquillian.core.spi.NonManagedObserver",
				"org.jboss.arquillian.container.spi.ContainerRegistry",
				"org.jboss.arquillian.container.spi.client.protocol.metadata.HTTPContext",
				"org.jboss.arquillian.container.spi.client.protocol.metadata.ProtocolMetaData",
				"org.jboss.arquillian.container.spi.client.deployment.DeploymentDescription",
				"org.jboss.arquillian.container.spi.client.deployment.Deployment",
				"org.jboss.arquillian.container.spi.event.DeployDeployment",
				"org.jboss.arquillian.container.spi.event.UnDeployDeployment",
				"org.jboss.arquillian.container.spi.event.SetupContainer",
				"org.jboss.arquillian.container.spi.event.StartContainer",
				"org.jboss.arquillian.container.spi.event.StopContainer",
				"org.jboss.arquillian.core.impl.loadable.LoadableExtensionLoader"
        ],
        target: this
	})

	var invoke = function(f) { // Need to set TCCL to something else then Orig TCCL due to odd ClassLoader issue with Nashorn
		var classLoader = ManagerBuilder.class.getClassLoader();
		var curr = java.lang.Thread.currentThread().getContextClassLoader();
		
		java.lang.Thread.currentThread().setContextClassLoader(classLoader);
		return f();
		java.lang.Thread.currentThread().setContextClassLoader(curr);
	}

	container = function(manager, containerName, containerRef) {
		var deployments = {};
		var resolveURL = function(metadata) {
			var context = metadata.getContext(HTTPContext.class);
			var servlet = context.getServlets().get(0);
			
			return servlet.getBaseURI().toString();
		}
		var deploy = function(name, f) {
			var archive = f(ShrinkWrap.create(WebArchive.class, name));
			var description = new DeploymentDescription(name, archive);
			description.shouldBeTestable(false)

			var deployment = new Deployment(description);
			deployments[name] = deployment;
			var metadata;
			manager.fire(
					new DeployDeployment(containerRef, deployment),
					new NonManagedObserver() {
						fired: function(event) {
							metadata = manager.resolve(ProtocolMetaData.class);
						}
					});
			return resolveURL(metadata);
		}
		var undeploy = function(name) {
			manager.fire(new UnDeployDeployment(containerRef, deployments[name]));
		}
		return {
			start: function() {
				manager.fire(new SetupContainer(containerRef));
				manager.fire(new StartContainer(containerRef));
			},
			stop: function() {
				manager.fire(new StopContainer(containerRef));
			},
			deploy: deploy,
			undeploy: undeploy,
			run: function(deployment, f) {
				var id = java.util.UUID.randomUUID().toString() + ".war";
				f(deploy(id, deployment));
				undeploy(id);
			},
		}
	};

	return {
		start: function(extensions) {
			// Setup Extension system properties
			for(ext in extensions) {
				for(config in extensions[ext]) {
					var propName = "arq.extension." + ext + "." + config;
					var propValue = extensions[ext][config]
					java.lang.System.setProperty(propName, propValue);
				}
			}

			manager = invoke(function() {
				return ManagerBuilder.from()
				.extensions(LoadableExtensionLoader.class)
				.create();
			})
			manager.start();
		},
		shutdown: function() {
			manager.shutdown();
		},
		container: function(name, configuration) {
			var serviceLoader = manager.resolve(ServiceLoader.class);
			var arqDescriptor = manager.resolve(ArquillianDescriptor.class);
			var containerDef = arqDescriptor.container(name);
			containerDef.setMode("custom")
			for(var prop in configuration){
				containerDef.property(prop, configuration[prop]);
			}
			var registry = manager.resolve(ContainerRegistry.class);
			var containerRef = registry.create(containerDef, serviceLoader);
			return container(manager, name, containerRef);
		}
	}
}

this.Arquillian = arquillian();
