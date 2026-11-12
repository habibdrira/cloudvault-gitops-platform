FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Install base dependencies, tools, runtimes and utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    make \
    jq \
    openssh-client \
    rsync \
    python3 \
    python3-pip \
    python3-yaml \
    ansible \
    golang-go \
    nodejs \
    npm \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Install kubectl
RUN curl -fsSL -o /etc/apt/keyrings/kubernetes-apt-keyring.asc https://pkgs.k8s.io/core:/stable:/v1.30/deb/Release.key \
    && echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.asc] https://pkgs.k8s.io/core:/stable:/v1.30/deb/ /' > /etc/apt/sources.list.d/kubernetes.list \
    && apt-get update && apt-get install -y --no-install-recommends kubectl \
    && rm -rf /var/lib/apt/lists/*

# Install Helm
RUN curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Ensure non-root ubuntu user has passwordless sudo
RUN echo "ubuntu ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/ubuntu \
    && chmod 0440 /etc/sudoers.d/ubuntu

USER ubuntu
WORKDIR /workspace

