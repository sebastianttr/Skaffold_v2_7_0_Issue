### Steps to run: 
- Check Skaffold configuration. Please change some paths to container registries
- Change namespaces in skaffold and deployment/dev/templates to any namespace you would like to use.
- start skaffold dev by running ``npm run dev-remote``


### Expected behavior

skaffold running together with node used to sync and hot reload in a matter of 1-2 seconds on the cloud.

### Actual behavior

skaffold does sync the file instantly, but it does not reload the project. See logs for ruther info.

### Information

Skaffold version: v2.7.1
Operating system: Windows 11 Pro 64-Bit (10.0, Build 22621)
Installed via: Chocolatey

Contents of skaffold.yaml:

```yaml
apiVersion: skaffold/v2beta19
kind: Config

profiles:
  - name: clusterbuild
    build:
      artifacts:
          - image: ###
            sync:
              infer:
                - '**/*.js'
                - '**/*.ts'
            kaniko:
              cache:
                repo: ###
              dockerfile: ./Dockerfile.dev
      cluster:
        namespace: kaniko
        nodeSelector:
          "kubernetes.io/os": linux
          "kaniko": "true"
        dockerConfig:
          secretName: gitlab-secret
          #path: ~/.docker/config.ts
    deploy:
      helm:
        flags:
          upgrade:
            - --install
        releases:
          - name: file-service
            chartPath: deployment/dev-remote
            namespace: development
            artifactOverrides:
              image: ###
            imageStrategy:
              helm:
                explicitRegistry: true
```

## Further System Information

Helm version: v3.12.0
kubectl version: v1.27.3

AKS uses arm64 CPUs ...

Contents of Dockerfile.dev:

```dockerfile
FROM node:17-slim

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy rest of the application csource code
COPY . .

RUN mkdir "uploads"

RUN npm run build

# Run index.ts
ENTRYPOINT ["npm", "run", "dev"]
```

### Context

We have a Node service running on AKS and we suddendly have the issue of not being able to develop in the way we used to because the reloading of the project with skaffold takes too long. According to the debug logs, it is syncing instantly.

We have our own helm charts that have no issue being deployed with the helm cli. We have run skaffold with other services such as a Java Quarkus Service and they ran perfectly fine. But as soon as we develop on a node server, it takes too long to Sync the files...

We went further and cloned older commits that we know definitly work and the gave us they same laggy behaviour.

Important to note here is that during development, everything is running on AKS like the docker build with Kaniko.

### Steps to reproduce the behavior

1. skaffold dev -p clusterbuild --platform linux/arm64 -vdebug

### Logs from skaffold

```
[file-service-container] > concurrently "nodemon"  "nodemon -x tsoa spec-and-routes"
[file-service-container]
[file-service-container] [0] [nodemon] 2.0.22
[file-service-container] [0] [nodemon] to restart at any time, enter `rs`
[file-service-container] [0] [nodemon] watching path(s): src/**/*
[file-service-container] [0] [nodemon] watching extensions: ts,json
[file-service-container] [0] [nodemon] starting `ts-node src/app.ts`
[file-service-container] [1] [nodemon] 2.0.22
[file-service-container] [1] [nodemon] to restart at any time, enter `rs`
[file-service-container] [1] [nodemon] watching path(s): src/**/*
[file-service-container] [1] [nodemon] watching extensions: ts,json
[file-service-container] [1] [nodemon] starting `tsoa spec-and-routes`
[file-service-container] [1] [nodemon] clean exit - waiting for changes before restart
[file-service-container] [0] NODE_ENV development /app/src/config/config.development.json
[file-service-container] [0] Server started listening on http://localhost:3001
[file-service-container] [0] Kafka Successfully connected.
[file-service-container] [0] Connected successfully to MongoDB
time="2023-09-14T12:16:33+02:00" level=debug msg="Change detectednotify.Create: \"src\\services\\ExportService.ts~\"" subtask=-1 task=DevLoop
time="2023-09-14T12:16:33+02:00" level=debug msg="Change detectednotify.Write: \"src\\services\\ExportService.ts~\"" subtask=-1 task=DevLoop
time="2023-09-14T12:16:33+02:00" level=debug msg="Change detectednotify.Write: \"src\\services\\ExportService.ts\"" subtask=-1 task=DevLoop
time="2023-09-14T12:16:33+02:00" level=debug msg="Change detectednotify.Write: \"src\\services\\ExportService.ts\"" subtask=-1 task=DevLoop
time="2023-09-14T12:16:33+02:00" level=debug msg="Change detectednotify.Write: \"src\\services\\ExportService.ts\"" subtask=-1 task=DevLoop
time="2023-09-14T12:16:33+02:00" level=debug msg="Change detectednotify.Remove: \"src\\services\\ExportService.ts~\"" subtask=-1 task=DevLoop
time="2023-09-14T12:16:33+02:00" level=debug msg="Change detectednotify.Create: \".idea\\workspace.xml.tmp\"" subtask=-1 task=DevLoop
time="2023-09-14T12:16:33+02:00" level=debug msg="Change detectednotify.Write: \".idea\\workspace.xml.tmp\"" subtask=-1 task=DevLoop
time="2023-09-14T12:16:33+02:00" level=debug msg="Change detectednotify.Rename: \".idea\\workspace.xml~\"" subtask=-1 task=DevLoop
time="2023-09-14T12:16:33+02:00" level=debug msg="Change detectednotify.Rename: \".idea\\workspace.xml\"" subtask=-1 task=DevLoop
time="2023-09-14T12:16:33+02:00" level=debug msg="Change detectednotify.Rename: \".idea\\workspace.xml\"" subtask=-1 task=DevLoop
time="2023-09-14T12:16:33+02:00" level=debug msg="Change detectednotify.Rename: \".idea\\workspace.xml.tmp\"" subtask=-1 task=DevLoop
time="2023-09-14T12:16:33+02:00" level=debug msg="Change detectednotify.Write: \".idea\\workspace.xml\"" subtask=-1 task=DevLoop
time="2023-09-14T12:16:33+02:00" level=debug msg="Change detectednotify.Remove: \".idea\\workspace.xml~\"" subtask=-1 task=DevLoop
time="2023-09-14T12:16:34+02:00" level=debug msg="Found dependencies for dockerfile: [{package-lock.json /app true 6 6} {package.json /app true 6 6} {. /app true 10 10}]" subtask=-1 task=DevLoop
time="2023-09-14T12:16:35+02:00" level=info msg="files modified: [src\\services\\ExportService.ts]" subtask=-1 task=DevLoop
time="2023-09-14T12:16:35+02:00" level=debug msg="Found dependencies for dockerfile: [{package-lock.json /app true 6 6} {package.json /app true 6 6} {. /app true 10 10}]" subtask=-1 task=DevLoop
time="2023-09-14T12:16:49+02:00" level=debug msg=" devloop: build false, sync true, deploy false\n" subtask=-1 task=DevLoop
Syncing 1 files for file-service-v2/dev:latest@sha256:9652f972d8f0a815c378e22580fafc875e6a08fa2fa59d9152e2086ebe7683ce
time="2023-09-14T12:16:49+02:00" level=info msg="Copying files:map[src\\services\\ExportService.ts:[/app/src/services/ExportService.ts]]togitlab.quanticfinancial.com:5050/statar/q1-file-service-v2/dev:latest@sha256:9652f972d8f0a815c378e22580fafc875e6a08fa2fa59d9152e2086ebe7683ce" subtask=-1 task=DevLoop
time="2023-09-14T12:16:49+02:00" level=debug msg="getting client config for kubeContext: `Q1DevOpsCluster`" subtask=-1 task=DevLoop
time="2023-09-14T12:16:50+02:00" level=debug msg="Running command: [kubectl --context Q1DevOpsCluster --namespace development exec file-service-b445b9586-wwch9 --namespace development -c file-service-container -i -- tar xmf - -C / --no-same-owner]" subtask=-1 task=DevLoop
time="2023-09-14T12:16:54+02:00" level=debug msg="Command output: [], stderr: tar: Removing leading `/' from member names\n" subtask=-1 task=DevLoop
Watching for changes...
[file-service-container] [0] [nodemon] restarting due to changes...
[file-service-container] [1] [nodemon] starting `tsoa spec-and-routes`
[file-service-container] [0] [nodemon] starting `ts-node src/app.ts`
```

Notice the mount of time between the first sync line "Change detectednotify.Create" and "Found dependencies for dockerfile:"
A whole 10-15 seconds compared to the 1-2 seconds we used to get. 

